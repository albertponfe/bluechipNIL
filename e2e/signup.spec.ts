/**
 * E2E: Athlete signup → onboarding → dashboard
 *
 * Prerequisites:
 *   firebase emulators:start --only auth,firestore,functions
 *   VITE_USE_EMULATORS=true npm run dev
 *
 * The test verifies:
 *   1. Role picker appears and athlete can be selected.
 *   2. Account is created with email/password.
 *   3. Onboarding wizard completes successfully.
 *   4. User lands on /athlete-dashboard.
 *   5. Firestore documents (users/{uid}, athletes/{uid}) contain correct data.
 *   6. The custom claim `role` equals "athlete".
 *
 * Note: Firestore doc verification calls the Firebase Emulator REST API directly
 * since Playwright runs in Node, not in the browser.
 */

import { test, expect } from '@playwright/test';

const EMULATOR_HOST = 'http://localhost:8080';
const PROJECT_ID = 'gen-lang-client-0835081362';
const AUTH_EMULATOR = 'http://localhost:9099';

/** Unique email per test run to avoid collisions. */
function testEmail() {
  return `athlete_test_${Date.now()}@example.com`;
}

/** Read a Firestore document directly from the emulator REST API. */
async function getFirestoreDoc(collection: string, docId: string): Promise<Record<string, unknown>> {
  const url = `${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Firestore emulator returned ${resp.status} for ${collection}/${docId}`);
  const body = await resp.json() as { fields?: Record<string, unknown> };
  return body.fields ?? {};
}

/** Get user's custom claims from the Auth emulator. */
async function getAuthClaims(uid: string): Promise<Record<string, unknown>> {
  const url = `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }),
  });
  if (!resp.ok) throw new Error(`Auth emulator lookup failed: ${resp.status}`);
  const body = await resp.json() as { users?: Array<{ customAttributes?: string }> };
  const user = body.users?.[0];
  if (!user?.customAttributes) return {};
  return JSON.parse(user.customAttributes) as Record<string, unknown>;
}

test.describe('Athlete signup flow', () => {
  let email: string;

  test.beforeEach(() => {
    email = testEmail();
  });

  test('completes signup, onboarding, and lands on athlete dashboard', async ({ page }) => {
    // ── Navigate to app ──────────────────────────────────────────────────
    await page.goto('/');

    // ── Click "Get Started" / login CTA on landing page ──────────────────
    // The LandingPage has a button that sets showAuth; clicking it navigates to /auth.
    // We navigate directly to avoid depending on exact landing page copy.
    await page.goto('/auth');

    // Switch to signup mode (default is login).
    await page.getByText('Sign Up').last().click();

    // ── Step 1: Role picker ───────────────────────────────────────────────
    await expect(page.getByTestId('role-athlete')).toBeVisible();
    await page.getByTestId('role-athlete').click();
    await page.getByTestId('role-next').click();

    // ── Step 2: Credentials ───────────────────────────────────────────────
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('Test1234!');
    await page.getByTestId('submit-auth').click();

    // ── Onboarding wizard — Step 1: Basics ───────────────────────────────
    await page.waitForURL('**/onboarding', { timeout: 15_000 });
    await page.getByTestId('athlete-name').fill('Jane Athlete');
    await page.getByTestId('athlete-university').fill('State University');
    await page.getByRole('button', { name: /continue/i }).click();

    // ── Onboarding wizard — Step 2: Sport ────────────────────────────────
    await page.getByTestId('athlete-sport').fill('Basketball');
    await page.getByTestId('athlete-year').selectOption('Junior');
    await page.getByRole('button', { name: /continue/i }).click();

    // ── Onboarding wizard — Step 3: Socials ──────────────────────────────
    await page.getByTestId('athlete-instagram').fill('@janeathlete');
    await page.getByTestId('athlete-submit').click();

    // ── Should land on athlete dashboard ─────────────────────────────────
    await page.waitForURL('**/athlete-dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/athlete-dashboard/);

    // ── Retrieve the UID from the page (stored in window by the React app) ─
    // We expose the UID via a data attribute on the root element in test mode.
    // As a fallback, look it up by email from the Auth emulator.
    const listUrl = `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`;
    const listResp = await fetch(listUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [email] }),
    });
    const listBody = await listResp.json() as { users?: Array<{ localId: string }> };
    const uid = listBody.users?.[0]?.localId;
    expect(uid).toBeTruthy();

    // ── Verify users/{uid} Firestore doc ──────────────────────────────────
    const userFields = await getFirestoreDoc('users', uid!);
    expect((userFields.role as { stringValue: string })?.stringValue).toBe('athlete');
    expect(
      (userFields.flags as { mapValue: { fields: { onboardingComplete: { booleanValue: boolean } } } })
        ?.mapValue?.fields?.onboardingComplete?.booleanValue
    ).toBe(true);

    // ── Verify athletes/{uid} Firestore doc ───────────────────────────────
    const athleteFields = await getFirestoreDoc('athletes', uid!);
    expect((athleteFields.name as { stringValue: string })?.stringValue).toBe('Jane Athlete');
    expect((athleteFields.sport as { stringValue: string })?.stringValue).toBe('Basketball');
    expect((athleteFields.university as { stringValue: string })?.stringValue).toBe('State University');

    // ── Verify custom claim role == "athlete" ─────────────────────────────
    const claims = await getAuthClaims(uid!);
    expect(claims.role).toBe('athlete');
  });
});
