/**
 * Shared firebase-admin singletons.
 * Import from here (not from index.ts) to avoid circular dependencies.
 */
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Guard against double-init when the module is evaluated more than once.
if (!getApps().length) {
  initializeApp();
}

const app = getApp();

// Project uses a named Firestore database (matches the client's firestoreDatabaseId).
// The local emulator uses '(default)'; override via FIRESTORE_DATABASE_ID env var.
const DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ?? 'ai-studio-2a9dfcf3-cbad-4adf-8347-acbedc040ea7';

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, DATABASE_ID);
