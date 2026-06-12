import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const DEV_KEY = "dev-only-key-do-not-use-in-prod-ba2olak-whatsapp";

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SETTINGS_ENCRYPTION_KEY is required in production.");
    }
    // Deterministic dev key so credentials survive process restarts in dev.
    return crypto.createHash("sha256").update(DEV_KEY).digest();
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypts a plaintext credential. Returns "<iv>:<ciphertext>:<authtag>" (hex). */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${ciphertext.toString("hex")}:${authTag.toString("hex")}`;
}

/**
 * Decrypts a credential produced by encryptCredential.
 * Returns null if decryption fails (wrong key, tampered data, or not yet set).
 */
export function decryptCredential(ciphertext: string): string | null {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, ctHex, tagHex] = parts as [string, string, string];
    const key = getKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}
