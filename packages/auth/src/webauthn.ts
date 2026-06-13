import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "@workspace/db/client";
import type { UserPasskey } from "@workspace/db/schemas/auth/user-passkeys";
import { UserPasskeysTable } from "@workspace/db/schemas/auth/user-passkeys";

/**
 * WebAuthn/passkey core, ported lean from the Funtastic template. Stateless
 * with respect to the challenge: callers persist/lookup the expected
 * challenge themselves (e.g. short-lived httpOnly cookie), keeping this
 * module free of any token-storage coupling. No UI consumer yet.
 */

export type PasskeyRelyingParty = {
  /** Hostname, e.g. "ba2olak.com". */
  rpId: string;
  rpName: string;
  /** Full origin, e.g. "https://ba2olak.com". */
  origin: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

/**
 * Reads the relying-party config from env (mirrors `createGoogleOAuthClient`).
 * Dev: WEBAUTHN_RP_ID=localhost, WEBAUTHN_ORIGIN=http://localhost:3000.
 * Prod: the registrable domain + full https origin.
 */
export function getRelyingPartyFromEnv(): PasskeyRelyingParty {
  return {
    rpId: requiredEnv("WEBAUTHN_RP_ID"),
    rpName: requiredEnv("WEBAUTHN_RP_NAME"),
    origin: requiredEnv("WEBAUTHN_ORIGIN"),
  };
}

/**
 * The browser-produced ceremony payloads are opaque, deeply-nested structures
 * fully validated by @simplewebauthn during verification. We only assert "an
 * object" at the tRPC boundary and keep the precise types here, so the API
 * package doesn't need a direct @simplewebauthn dependency.
 */
export const registrationResponseSchema = z.custom<RegistrationResponseJSON>(
  (value) => typeof value === "object" && value !== null,
  { message: "auth.passkey.invalidResponse" },
);
export const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
    { message: "auth.passkey.invalidResponse" },
  );

function toTransports(transports: string[] | null) {
  return transports as
    | NonNullable<
        Parameters<
          typeof generateAuthenticationOptions
        >[0]["allowCredentials"]
      >[number]["transports"]
    | undefined;
}

export async function createPasskeyRegistrationOptions(options: {
  rp: PasskeyRelyingParty;
  user: { id: string; name: string | null };
  existingPasskeys: Pick<UserPasskey, "credentialId" | "transports">[];
}) {
  return generateRegistrationOptions({
    rpID: options.rp.rpId,
    rpName: options.rp.rpName,
    userName: options.user.name ?? options.user.id,
    userID: new TextEncoder().encode(options.user.id),
    attestationType: "none",
    excludeCredentials: options.existingPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: toTransports(passkey.transports ?? null),
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function registerPasskey(options: {
  db: Db;
  rp: PasskeyRelyingParty;
  userId: string;
  label?: string;
  expectedChallenge: string;
  response: RegistrationResponseJSON;
}): Promise<UserPasskey | null> {
  const verification = await verifyRegistrationResponse({
    response: options.response,
    expectedChallenge: options.expectedChallenge,
    expectedOrigin: options.rp.origin,
    expectedRPID: options.rp.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) return null;

  const { credential, aaguid, credentialBackedUp, credentialDeviceType } =
    verification.registrationInfo;

  const [row] = await options.db
    .insert(UserPasskeysTable)
    .values({
      userId: options.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      label: options.label ?? null,
      transports: credential.transports ?? null,
      signCount: credential.counter,
      aaguid,
      isBackupEligible: credentialDeviceType === "multiDevice",
      isBackupState: credentialBackedUp,
    })
    .returning();

  return row ?? null;
}

export async function createPasskeyAuthenticationOptions(options: {
  rp: PasskeyRelyingParty;
  allowedPasskeys?: Pick<UserPasskey, "credentialId" | "transports">[];
}) {
  return generateAuthenticationOptions({
    rpID: options.rp.rpId,
    userVerification: "preferred",
    allowCredentials: options.allowedPasskeys?.map((passkey) => ({
      id: passkey.credentialId,
      transports: toTransports(passkey.transports ?? null),
    })),
  });
}

export async function authenticateWithPasskey(options: {
  db: Db;
  rp: PasskeyRelyingParty;
  expectedChallenge: string;
  response: AuthenticationResponseJSON;
}): Promise<UserPasskey | null> {
  const passkey = await options.db.query.UserPasskeysTable.findFirst({
    where: eq(UserPasskeysTable.credentialId, options.response.id),
  });
  if (!passkey) return null;

  const verification = await verifyAuthenticationResponse({
    response: options.response,
    expectedChallenge: options.expectedChallenge,
    expectedOrigin: options.rp.origin,
    expectedRPID: options.rp.rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
      counter: passkey.signCount,
      transports: toTransports(passkey.transports ?? null),
    },
  });

  if (!verification.verified) return null;

  await options.db
    .update(UserPasskeysTable)
    .set({
      signCount: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(UserPasskeysTable.id, passkey.id));

  return passkey;
}
