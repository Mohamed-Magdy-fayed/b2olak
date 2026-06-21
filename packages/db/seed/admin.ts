import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { UserCredentialsTable } from "../src/schemas/auth/user-credentials";
import { UsersTable } from "../src/schemas/auth/users";
import { db } from "./db";

/**
 * Seeds the first admin account.
 * Override with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
 *
 * scrypt hashing is inlined (identical to @workspace/auth/password-hasher) to
 * keep db ← auth dependency direction acyclic.
 */

function generateSalt() {
  return crypto.randomBytes(16).toString("hex").normalize();
}

function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize(), salt, 64, (error, hash) => {
      if (error) reject(error);
      resolve(hash.toString("hex").normalize());
    });
  });
}

export async function seedAdmin() {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? "admin@ba2olak.local"
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await db.query.UsersTable.findFirst({
    where: and(eq(UsersTable.email, email), isNull(UsersTable.deletedAt)),
  });

  if (existing) {
    console.log(`Admin ${email} already exists — skipping.`);
    return;
  }

  const [admin] = await db
    .insert(UsersTable)
    .values({
      email,
      name: "Admin",
      role: "admin",
      emailVerifiedAt: new Date(),
      createdBy: "seed",
    })
    .returning();

  if (!admin) throw new Error("Failed to insert admin user");

  const salt = generateSalt();
  await db.insert(UserCredentialsTable).values({
    userId: admin.id,
    passwordHash: await hashPassword(password, salt),
    salt,
    createdBy: "seed",
  });

  console.log(`Admin created: ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      `⚠ Default password "${password}" used — set SEED_ADMIN_PASSWORD and change it before going live.`,
    );
  }
}
