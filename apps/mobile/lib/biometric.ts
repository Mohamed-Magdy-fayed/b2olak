import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

/**
 * Local biometric (Face ID / fingerprint / device PIN) helpers. This is a
 * convenience lock over the already-stored session token — not a passkey. The
 * web preview has no local authenticator, so it reports unavailable and the
 * gate is skipped there.
 */

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

/** Runs the OS biometric prompt. Returns true on success. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // Let the OS fall back to the device passcode so a user whose biometric
    // fails repeatedly is never locked out of their own account.
    disableDeviceFallback: false,
  });
  return result.success;
}
