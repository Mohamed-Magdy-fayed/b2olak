import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Session token + locale storage.
 * Native: SecureStore (Keychain/Keystore) — the session id is a bearer
 * credential and never touches AsyncStorage (docs/06-security.md).
 * Web (expo web preview): SecureStore is unavailable → localStorage.
 */

const TOKEN_KEY = "session-token";
const ACCOUNTS_KEY = "accounts";
const LOCALE_KEY = "locale";

const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await deleteItem(TOKEN_KEY);
}

/**
 * Multi-account store. The device can hold several signed-in sessions at once
 * (e.g. a customer and a captain on the same phone). Each account keeps its own
 * bearer token; `TOKEN_KEY` always mirrors the *active* account's token so the
 * tRPC client (lib/trpc.tsx) keeps reading a single source of truth.
 */
export type StoredAccount = {
  userId: string;
  token: string;
  role: string;
  name: string;
  phone: string;
  /**
   * Whether this account is unlocked with the device biometric on launch.
   * Saved per account (ease of access, not bank-level security) so a returning
   * user is prompted to use Face ID / fingerprint for the account they open.
   */
  biometricEnabled?: boolean;
};

async function readAccounts(): Promise<StoredAccount[]> {
  const raw = await getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: StoredAccount[]): Promise<void> {
  if (accounts.length === 0) {
    await deleteItem(ACCOUNTS_KEY);
    return;
  }
  await setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function getAccounts(): Promise<StoredAccount[]> {
  return readAccounts();
}

/** The account whose token is currently active (drives the tRPC auth header). */
export async function getActiveAccount(): Promise<StoredAccount | null> {
  const [token, accounts] = await Promise.all([getToken(), readAccounts()]);
  if (!token) return null;
  return accounts.find((a) => a.token === token) ?? null;
}

/**
 * Add or refresh an account and make it active. Replacing by `userId` keeps a
 * single entry per user when a session is re-issued (new OTP sign-in).
 */
export async function upsertAccount(account: StoredAccount): Promise<void> {
  const accounts = await readAccounts();
  const existing = accounts.find((a) => a.userId === account.userId);
  const next = [
    ...accounts.filter((a) => a.userId !== account.userId),
    // Re-issuing a session (new OTP sign-in) must not drop the saved biometric
    // preference for this account.
    { biometricEnabled: existing?.biometricEnabled, ...account },
  ];
  await writeAccounts(next);
  await setToken(account.token);
}

/** Switch the active account by user id. No-op if the id isn't stored. */
export async function setActiveAccount(userId: string): Promise<void> {
  const account = (await readAccounts()).find((a) => a.userId === userId);
  if (account) await setToken(account.token);
}

/** Toggle the biometric-unlock preference for a single stored account. */
export async function setAccountBiometric(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const accounts = await readAccounts();
  const next = accounts.map((a) =>
    a.userId === userId ? { ...a, biometricEnabled: enabled } : a,
  );
  await writeAccounts(next);
}

/**
 * Remove the currently active account from the store and clear the active
 * token. Returns the accounts that remain so the caller can route to the
 * picker (if any are left) or back to sign-in.
 */
export async function removeActiveAccount(): Promise<StoredAccount[]> {
  const [token, accounts] = await Promise.all([getToken(), readAccounts()]);
  const remaining = accounts.filter((a) => a.token !== token);
  await writeAccounts(remaining);
  await clearToken();
  return remaining;
}

/**
 * Remove an account by user id and always clear the active token. Unlike
 * `removeActiveAccount`, this can't silently no-op when the active token is
 * stale/empty (which would otherwise leave the account stored and let the
 * entry router re-open it on the next launch). Returns the remaining accounts.
 */
export async function removeAccount(userId: string): Promise<StoredAccount[]> {
  const remaining = (await readAccounts()).filter((a) => a.userId !== userId);
  await writeAccounts(remaining);
  await clearToken();
  return remaining;
}

export async function getStoredLocale(): Promise<"en" | "ar" | null> {
  const value = await getItem(LOCALE_KEY);
  return value === "en" || value === "ar" ? value : null;
}

export async function setStoredLocale(locale: "en" | "ar"): Promise<void> {
  await setItem(LOCALE_KEY, locale);
}
