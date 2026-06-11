import { z } from "zod";

/**
 * Egyptian mobile numbers: 010/011/012/015 + 8 digits.
 * Accepts local ("01001234567") or international ("+201001234567", "201001234567")
 * input and normalizes to E.164 (+201xxxxxxxxx).
 */
export const egyptianPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .transform((value) => {
    if (value.startsWith("+20")) return value;
    if (value.startsWith("20")) return `+${value}`;
    if (value.startsWith("0")) return `+2${value}`;
    return value;
  })
  .pipe(
    z
      .string()
      .regex(/^\+201[0125][0-9]{8}$/, { error: "validation.phoneInvalid" }),
  );

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, { error: "validation.otpInvalid" });

export const requestOtpSchema = z.object({
  phone: egyptianPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: egyptianPhoneSchema,
  code: otpCodeSchema,
});

export const signInPasswordSchema = z.object({
  email: z.email({ error: "validation.emailInvalid" }),
  password: z.string().min(8, { error: "validation.passwordTooShort" }),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  preferredLocale: z.enum(["en", "ar"]).optional(),
});
