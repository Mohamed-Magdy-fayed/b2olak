import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@workspace/api/root";

import { authenticate } from "./biometric";
import { getExpoPushToken } from "./notifications";
import {
  getStoredLocale,
  getToken,
  upsertAccount,
} from "./session";

/**
 * Trusted-device biometric login. The session token is short-lived and is
 * destroyed on sign-out; this device credential is the *persistent* one. On
 * first opt-in the server mints a random secret (we never generate crypto on
 * the client) which we keep in SecureStore behind the OS biometric. Afterwards
 * a Face ID / fingerprint check unlocks the secret and `deviceLogin` mints a
 * fresh session — no OTP. Mirrors the web passkey flow, device-bound instead.
 */

const DEVICE_ID_KEY = "device-id";
const DEVICE_SECRET_KEY = "device-secret";
const TRUSTED_ACCOUNT_KEY = "trusted-account";

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

export type TrustedAccount = {
  userId: string;
  role: string;
  name: string;
  phone: string;
};

let _client: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;
function getClient(): ReturnType<typeof createTRPCClient<AppRouter>> {
  if (!_client) {
    _client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const [token, locale] = await Promise.all([
              getToken(),
              getStoredLocale(),
            ]);
            return {
              ...(token ? { authorization: `Bearer ${token}` } : {}),
              ...(locale ? { "x-locale": locale } : {}),
            };
          },
        }),
      ],
    });
  }
  return _client;
}

export async function getTrustedAccount(): Promise<TrustedAccount | null> {
  const raw = await getItem(TRUSTED_ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrustedAccount;
  } catch {
    return null;
  }
}

async function getDeviceCreds(): Promise<{
  deviceId: string;
  secret: string;
} | null> {
  const [deviceId, secret] = await Promise.all([
    getItem(DEVICE_ID_KEY),
    getItem(DEVICE_SECRET_KEY),
  ]);
  if (!deviceId || !secret) return null;
  return { deviceId, secret };
}

/** True when this device can biometric-login a remembered account. */
export async function hasTrustedDevice(): Promise<boolean> {
  return (await getDeviceCreds()) !== null && (await getTrustedAccount()) !== null;
}

/**
 * Register this device (once) and remember the account for biometric login.
 * Call while signed in — the bearer token authorises `registerDevice`.
 */
export async function ensureDeviceRegistered(account: {
  userId: string;
  role: string;
  name: string | null;
  phone: string | null;
}): Promise<void> {
  if (!(await getDeviceCreds())) {
    const res = await getClient().auth.registerDevice.mutate({
      label: Platform.OS,
    });
    await setItem(DEVICE_ID_KEY, res.deviceId);
    await setItem(DEVICE_SECRET_KEY, res.secret);
  }
  await setItem(
    TRUSTED_ACCOUNT_KEY,
    JSON.stringify({
      userId: account.userId,
      role: account.role,
      name: account.name ?? "",
      phone: account.phone ?? "",
    } satisfies TrustedAccount),
  );
}

/**
 * Biometric → device login. Prompts Face ID / fingerprint, then mints a fresh
 * session via the device secret (no OTP) and activates it. Returns the role on
 * success, or null when the user cancels or the credential is rejected.
 */
export async function biometricLogin(
  promptMessage: string,
): Promise<{ role: string } | null> {
  const [creds, trusted] = await Promise.all([
    getDeviceCreds(),
    getTrustedAccount(),
  ]);
  if (!creds || !trusted) return null;
  if (!(await authenticate(promptMessage))) return null;
  try {
    const res = await getClient().auth.deviceLogin.mutate({
      deviceId: creds.deviceId,
      secret: creds.secret,
    });
    await upsertAccount({
      userId: res.user.id,
      token: res.sessionId,
      role: res.user.role,
      name: res.user.name ?? "",
      phone: res.user.phone ?? "",
      biometricEnabled: true,
    });
    void getExpoPushToken().then((pushToken) => {
      if (pushToken) {
        void getClient().auth.registerPushToken.mutate({ token: pushToken });
      }
    });
    await setItem(
      TRUSTED_ACCOUNT_KEY,
      JSON.stringify({
        userId: res.user.id,
        role: res.user.role,
        name: res.user.name ?? "",
        phone: res.user.phone ?? "",
      } satisfies TrustedAccount),
    );
    return { role: res.user.role };
  } catch {
    return null;
  }
}

/** Turn off biometric login: revoke server-side (best-effort) and wipe locally. */
export async function forgetTrustedDevice(): Promise<void> {
  const creds = await getDeviceCreds();
  if (creds) {
    try {
      await getClient().auth.revokeDevice.mutate({ deviceId: creds.deviceId });
    } catch {
      // best-effort — local wipe below is what matters for the user
    }
  }
  await Promise.all([
    deleteItem(DEVICE_ID_KEY),
    deleteItem(DEVICE_SECRET_KEY),
    deleteItem(TRUSTED_ACCOUNT_KEY),
  ]);
}
