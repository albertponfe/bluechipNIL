"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = exports.adminAuth = void 0;
/**
 * Shared firebase-admin singletons.
 * Import from here (not from index.ts) to avoid circular dependencies.
 */
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
// Guard against double-init when the module is evaluated more than once.
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const app = (0, app_1.getApp)();
// Project uses a named Firestore database (matches the client's firestoreDatabaseId).
// The local emulator uses '(default)'; override via FIRESTORE_DATABASE_ID env var.
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID ?? 'ai-studio-2a9dfcf3-cbad-4adf-8347-acbedc040ea7';
exports.adminAuth = (0, auth_1.getAuth)(app);
exports.adminDb = (0, firestore_1.getFirestore)(app, DATABASE_ID);
//# sourceMappingURL=admin.js.map