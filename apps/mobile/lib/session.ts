import * as SecureStore from "expo-secure-store";

/**
 * Session token + locale storage.
 * The session id is a bearer credential — SecureStore only (Keychain/Keystore),
 * never AsyncStorage (docs/06-security.md).
 */

const TOKEN_KEY = "session-token";
const LOCALE_KEY = "locale";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredLocale(): Promise<"en" | "ar" | null> {
  const value = await SecureStore.getItemAsync(LOCALE_KEY);
  return value === "en" || value === "ar" ? value : null;
}

export async function setStoredLocale(locale: "en" | "ar"): Promise<void> {
  await SecureStore.setItemAsync(LOCALE_KEY, locale);
}
