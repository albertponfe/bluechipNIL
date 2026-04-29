import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../admin';

type UserRole = 'athlete' | 'brand' | 'admin';

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
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  // Retrieve any pendingRole stashed before account creation by setPendingRole.
  // onUserCreate fires asynchronously; for brand signups the callable may win
  // the race, but we guard with a fresh getUser to pick it up if it arrived.
  let role: UserRole = 'athlete';
  try {
    const freshRecord = await adminAuth.getUser(uid);
    const claims = freshRecord.customClaims as Record<string, unknown> | null;
    if (claims?.pendingRole === 'brand') {
      role = 'brand';
    }
  } catch (err) {
    functions.logger.warn(`Could not fetch custom claims for ${uid}:`, err);
  }

  // Persist permanent custom claims (drop pendingRole, install role + activeRole).
  await adminAuth.setCustomUserClaims(uid, { role, activeRole: role });

  // Create the server-authoritative users/{uid} document.
  await adminDb.doc(`users/${uid}`).set({
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
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
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
      await adminAuth.generateEmailVerificationLink(email);
      // TODO: send the link via your transactional email provider.
    } catch (err) {
      functions.logger.error(`Failed to generate verification link for ${uid}:`, err);
    }
  }

  functions.logger.info(`Initialized user ${uid} (role=${role})`);
});
