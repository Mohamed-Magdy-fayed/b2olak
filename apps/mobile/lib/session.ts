import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Session token + locale storage.
 * Native: SecureStore (Keychain/Keystore) — the session id is a bearer
 * credential and never touches AsyncStorage (docs/06-security.md).
 * Web (expo web preview): SecureStore is unavailable → localStorage.
 */

const TOKEN_KEY = "session-token";
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

export async function getStoredLocale(): Promise<"en" | "ar" | null> {
  const value = await getItem(LOCALE_KEY);
  return value === "en" || value === "ar" ? value : null;
}

export async function setStoredLocale(locale: "en" | "ar"): Promise<void> {
  await setItem(LOCALE_KEY, locale);
}
