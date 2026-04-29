import * as functions from 'firebase-functions/v1';
import { adminAuth, adminDb } from '../admin';

type UserRole = 'athlete' | 'brand';

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
export const setPendingRole = functions.https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const typedData = data as { role?: string };
  const { role } = typedData;
  if (role !== 'athlete' && role !== 'brand') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      "role must be 'athlete' or 'brand'."
    );
  }

  const uid = context.auth.uid;
  const typedRole: UserRole = role;

  // Update custom claims so the next getIdToken(true) carries them.
  await adminAuth.setCustomUserClaims(uid, {
    role: typedRole,
    activeRole: typedRole,
  });

  // Patch users/{uid} if the onCreate trigger has already created it.
  const userRef = adminDb.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (snap.exists) {
    await userRef.update({ role: typedRole, activeRole: typedRole });
  } else {
    // Stash pendingRole so onCreate can read it during the race window.
    // The full document will be written by onUserCreate once it fires.
    await adminAuth.setCustomUserClaims(uid, {
      role: typedRole,
      activeRole: typedRole,
      pendingRole: typedRole,
    });
  }

  functions.logger.info(`Role set to '${typedRole}' for user ${uid}`);
  return { success: true, role: typedRole };
});
