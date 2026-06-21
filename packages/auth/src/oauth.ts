import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import type { OAuthProvider } from "@workspace/db/schemas/auth/user-oauth-accounts";
import { oAuthProviderValues } from "@workspace/db/schemas/auth/user-oauth-accounts";

/**
 * OAuth 2.0 client (authorization-code + PKCE), ported from the Funtastic
 * template. Framework-agnostic: callers pass a cookie jar (e.g. Next's
 * `cookies()`), this module never imports next/*.
 */

const STATE_COOKIE_KEY = "oAuthState";
const CODE_VERIFIER_COOKIE_KEY = "oAuthCodeVerifier";
const COOKIE_EXPIRATION_SECONDS = 60 * 10;

export type OAuthCookies = {
  set: (
    key: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax";
      expires?: Date;
      path?: string;
    },
  ) => void;
  get: (key: string) => { name: string; value: string } | undefined;
};

export type OAuthUser = {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export class OAuthClient<T> {
  private readonly provider: OAuthProvider;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private readonly urls: { auth: string; token: string; user: string };
  private readonly userInfo: {
    schema: z.ZodSchema<T>;
    parser: (data: T) => OAuthUser;
  };
  private readonly tokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
  });

  constructor({
    provider,
    clientId,
    clientSecret,
    scopes,
    urls,
    userInfo,
  }: {
    provider: OAuthProvider;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    urls: { auth: string; token: string; user: string };
    userInfo: { schema: z.ZodSchema<T>; parser: (data: T) => OAuthUser };
  }) {
    this.provider = provider;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scopes = scopes;
    this.urls = urls;
    this.userInfo = userInfo;
  }

  private get redirectUrl() {
    return new URL(this.provider, requiredEnv("OAUTH_REDIRECT_URL_BASE"));
  }

  createAuthUrl(cookies: Pick<OAuthCookies, "set">) {
    const state = createState(cookies);
    const codeVerifier = createCodeVerifier(cookies);
    const url = new URL(this.urls.auth);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUrl.toString());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set(
      "code_challenge",
      crypto.hash("sha256", codeVerifier, "base64url"),
    );
    return url.toString();
  }

  async fetchUser(
    code: string,
    state: string,
    cookies: Pick<OAuthCookies, "get">,
  ): Promise<OAuthUser> {
    if (!validateState(state, cookies)) throw new InvalidStateError();

    const { accessToken, tokenType } = await this.fetchToken(
      code,
      getCodeVerifier(cookies),
    );

    const user = await fetch(this.urls.user, {
      headers: { Authorization: `${tokenType} ${accessToken}` },
    })
      .then((res) => res.json())
      .then((rawData: unknown) => {
        const { data, success, error } =
          this.userInfo.schema.safeParse(rawData);
        if (!success) throw new InvalidUserError(error);
        return data;
      });

    return this.userInfo.parser(user);
  }

  private fetchToken(code: string, codeVerifier: string) {
    return fetch(this.urls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUrl.toString(),
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      }),
    })
      .then((res) => res.json())
      .then((rawData: unknown) => {
        const { data, success, error } = this.tokenSchema.safeParse(rawData);
        if (!success) throw new InvalidTokenError(error);
        return { accessToken: data.access_token, tokenType: data.token_type };
      });
  }
}

export function createGoogleOAuthClient() {
  return new OAuthClient({
    provider: "google",
    clientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    scopes: ["openid", "email", "profile"],
    urls: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      user: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    userInfo: {
      schema: z.object({
        sub: z.string(),
        name: z.string(),
        email: z.email(),
        picture: z.url().optional(),
      }),
      parser: (user) => ({
        id: user.sub,
        name: user.name,
        email: user.email,
        imageUrl: user.picture,
      }),
    },
  });
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (oAuthProviderValues as readonly string[]).includes(value);
}

export function getOAuthClient(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return createGoogleOAuthClient();
    default:
      throw new Error(`Invalid provider: ${provider satisfies never}`);
  }
}

export class InvalidTokenError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid Token");
    this.cause = zodError;
  }
}

export class InvalidUserError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid User");
    this.cause = zodError;
  }
}

export class InvalidStateError extends Error {
  constructor() {
    super("Invalid State");
  }
}

export class InvalidCodeVerifierError extends Error {
  constructor() {
    super("Invalid Code Verifier");
  }
}

function createState(cookies: Pick<OAuthCookies, "set">) {
  const state = crypto.randomBytes(64).toString("hex").normalize();
  cookies.set(STATE_COOKIE_KEY, state, {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + COOKIE_EXPIRATION_SECONDS * 1000),
  });
  return state;
}

function createCodeVerifier(cookies: Pick<OAuthCookies, "set">) {
  const codeVerifier = crypto.randomBytes(64).toString("hex").normalize();
  cookies.set(CODE_VERIFIER_COOKIE_KEY, codeVerifier, {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + COOKIE_EXPIRATION_SECONDS * 1000),
  });
  return codeVerifier;
}

function validateState(state: string, cookies: Pick<OAuthCookies, "get">) {
  return cookies.get(STATE_COOKIE_KEY)?.value === state;
}

function getCodeVerifier(cookies: Pick<OAuthCookies, "get">) {
  const codeVerifier = cookies.get(CODE_VERIFIER_COOKIE_KEY)?.value;
  if (codeVerifier == null) throw new InvalidCodeVerifierError();
  return codeVerifier;
}
