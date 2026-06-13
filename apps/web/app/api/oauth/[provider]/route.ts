import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  getOAuthClient,
  isOAuthProvider,
  type OAuthUser,
} from "@workspace/auth/oauth";
import { createSession } from "@workspace/auth/session";
import { db } from "@workspace/db/client";
import type { OAuthProvider } from "@workspace/db/schemas/auth/user-oauth-accounts";
import { UserOAuthAccountsTable } from "@workspace/db/schemas/auth/user-oauth-accounts";
import { UsersTable } from "@workspace/db/schemas/auth/users";

import { OAUTH_NEXT_COOKIE_KEY } from "@/features/auth/lib";
import { resolvePostLoginPath } from "@/features/auth/passkey-prompt";

import { COOKIE_SESSION_KEY, SESSION_EXPIRATION_SECONDS } from "@workspace/auth/session";

class OAuthFlowError extends Error {
  constructor(public readonly key: "failed" | "suspended" | "staff") {
    super(key);
  }
}

/**
 * Resolves the provider identity to a local user, creating or linking as
 * needed. Linking by email is restricted to customer accounts — staff sign in
 * with their password, so a leaked/recycled Gmail can never take over an
 * admin account.
 */
async function connectUserToAccount(provider: OAuthProvider, oUser: OAuthUser) {
  const email = oUser.email.trim().toLowerCase();

  return db.transaction(async (tx) => {
    const existingAccount = await tx.query.UserOAuthAccountsTable.findFirst({
      where: and(
        eq(UserOAuthAccountsTable.provider, provider),
        eq(UserOAuthAccountsTable.providerAccountId, oUser.id),
        isNull(UserOAuthAccountsTable.deletedAt),
      ),
      with: { user: true },
    });

    if (existingAccount?.user && existingAccount.user.deletedAt === null) {
      if (existingAccount.user.status === "suspended") {
        throw new OAuthFlowError("suspended");
      }
      return existingAccount.user;
    }

    const byEmail = await tx.query.UsersTable.findFirst({
      where: and(eq(UsersTable.email, email), isNull(UsersTable.deletedAt)),
    });

    let user = byEmail ?? null;

    if (user) {
      if (user.status === "suspended") throw new OAuthFlowError("suspended");
      if (user.role !== "customer") throw new OAuthFlowError("staff");

      const [updated] = await tx
        .update(UsersTable)
        .set({
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          name: user.name ?? oUser.name,
          imageUrl: user.imageUrl ?? oUser.imageUrl,
          updatedBy: `oauth:${provider}`,
        })
        .where(eq(UsersTable.id, user.id))
        .returning();
      user = updated ?? user;
    } else {
      const [created] = await tx
        .insert(UsersTable)
        .values({
          email,
          name: oUser.name,
          imageUrl: oUser.imageUrl,
          role: "customer",
          emailVerifiedAt: new Date(),
          createdBy: `oauth:${provider}`,
        })
        .returning();
      if (!created) throw new OAuthFlowError("failed");
      user = created;
    }

    await tx
      .insert(UserOAuthAccountsTable)
      .values({
        userId: user.id,
        provider,
        providerAccountId: oUser.id,
        createdBy: user.id,
      })
      .onConflictDoNothing();

    return user;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const fail = (key: "failed" | "suspended" | "staff") =>
    NextResponse.redirect(new URL(`/sign-in?oauthError=${key}`, url.origin));

  if (!isOAuthProvider(rawProvider) || !code || !state) return fail("failed");

  const store = await cookies();

  let oUser: OAuthUser;
  try {
    oUser = await getOAuthClient(rawProvider).fetchUser(code, state, store);
  } catch {
    return fail("failed");
  }

  let user;
  try {
    user = await connectUserToAccount(rawProvider, oUser);
  } catch (error) {
    return fail(error instanceof OAuthFlowError ? error.key : "failed");
  }

  await db
    .update(UsersTable)
    .set({ lastSignInAt: new Date() })
    .where(eq(UsersTable.id, user.id));

  const session = await createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLocale: user.preferredLocale,
  });

  const next = store.get(OAUTH_NEXT_COOKIE_KEY)?.value ?? null;
  const target = await resolvePostLoginPath({
    userId: user.id,
    role: user.role,
    next,
  });
  const response = NextResponse.redirect(new URL(target, url.origin));
  response.cookies.set(COOKIE_SESSION_KEY, session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000),
  });
  response.cookies.delete(OAUTH_NEXT_COOKIE_KEY);
  return response;
}
