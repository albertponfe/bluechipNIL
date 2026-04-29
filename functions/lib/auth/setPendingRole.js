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
exports.setPendingRole = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin_1 = require("../admin");
/**
 * Callable: auth.setPendingRole({ role })
 *
 * Called by the signup form immediately after createUserWithEmailAndPassword
 * (or Google sign-in) so the chosen role is reflected in custom claims before
 * the app forces a token refresh with getIdToken(true).
 *
 * Also updates the users/{uid} Firestore doc if it already exists (created by
 * onUserCreate). If onUserCreate hasn't finished yet the doc will be created
 * with the correct role there instead.
 */
exports.setPendingRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const typedData = data;
    const { role } = typedData;
    if (role !== 'athlete' && role !== 'brand') {
        throw new functions.https.HttpsError('invalid-argument', "role must be 'athlete' or 'brand'.");
    }
    const uid = context.auth.uid;
    const typedRole = role;
    // Update custom claims so the next getIdToken(true) carries them.
    await admin_1.adminAuth.setCustomUserClaims(uid, {
        role: typedRole,
        activeRole: typedRole,
    });
    // Patch users/{uid} if the onCreate trigger has already created it.
    const userRef = admin_1.adminDb.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (snap.exists) {
        await userRef.update({ role: typedRole, activeRole: typedRole });
    }
    else {
        // Stash pendingRole so onCreate can read it during the race window.
        // The full document will be written by onUserCreate once it fires.
        await admin_1.adminAuth.setCustomUserClaims(uid, {
            role: typedRole,
            activeRole: typedRole,
            pendingRole: typedRole,
        });
    }
    functions.logger.info(`Role set to '${typedRole}' for user ${uid}`);
    return { success: true, role: typedRole };
});
//# sourceMappingURL=setPendingRole.js.map