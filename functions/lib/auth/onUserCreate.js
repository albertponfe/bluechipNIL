"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../admin");
/**
 * Fires immediately when a new Firebase Auth user is created.
 *
 * Responsibilities:
 * 1. Read `pendingRole` from customClaims (set by the client's setPendingRole
 *    callable right before account creation completes); defaults to "athlete".
 * 2. Write the canonical users/{uid} doc (server-only writes per §10.1).
 * 3. Set {role, activeRole} custom claims so the client token reflects the role
 *    after the next getIdToken(true) refresh.
 * 4. Generate a Firebase email-verification link (uses the existing Firebase
 *    template; the client also calls sendEmailVerification() as a belt-and-
 *    suspenders measure when email/password signup is used).
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;
    // Retrieve any pendingRole stashed before account creation by setPendingRole.
    // onUserCreate fires asynchronously; for brand signups the callable may win
    // the race, but we guard with a fresh getUser to pick it up if it arrived.
    let role = 'athlete';
    try {
        const freshRecord = await admin_1.adminAuth.getUser(uid);
        const claims = freshRecord.customClaims;
        if (claims?.pendingRole === 'brand') {
            role = 'brand';
        }
    }
    catch (err) {
        functions.logger.warn(`Could not fetch custom claims for ${uid}:`, err);
    }
    // Persist permanent custom claims (drop pendingRole, install role + activeRole).
    await admin_1.adminAuth.setCustomUserClaims(uid, { role, activeRole: role });
    // Create the server-authoritative users/{uid} document.
    await admin_1.adminDb.doc(`users/${uid}`).set({
        uid,
        email: email ?? '',
        emailVerified: false,
        phone: null,
        phoneVerified: false,
        role,
        activeRole: role,
        status: 'active',
        displayName: displayName ?? '',
        photoUrl: photoURL ?? '',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        lastSeenAt: firestore_1.FieldValue.serverTimestamp(),
        flags: {
            idVerified: false,
            schoolVerified: false,
            businessVerified: false,
            onboardingComplete: false,
        },
        notificationPrefs: {
            email: { deals: true, messages: true, payments: true, system: true },
            push: { deals: true, messages: true, payments: true, system: true },
            sms: { deals: false, messages: false, payments: true, system: false },
        },
        blockedUserIds: [],
    });
    // Generate a Firebase email-verification link using the platform template.
    // In production route this through SendGrid / Mailgun; the client-side
    // sendEmailVerification() call covers the email/password flow automatically.
    if (email) {
        try {
            await admin_1.adminAuth.generateEmailVerificationLink(email);
            // TODO: send the link via your transactional email provider.
        }
        catch (err) {
            functions.logger.error(`Failed to generate verification link for ${uid}:`, err);
        }
    }
    functions.logger.info(`Initialized user ${uid} (role=${role})`);
});
//# sourceMappingURL=onUserCreate.js.map