import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

let app: App | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function getFirebaseAdmin(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0] as App;
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY")
        .replace(/\\n/g, "\n")
        .replace(/\r/g, ""),
    }),
    storageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
  });

  return app;
}

export function getStorageBucket() {
  return getStorage(getFirebaseAdmin()).bucket();
}
