# BlueChip NIL — Backend Architecture & Build Plan

A complete blueprint for turning the current single-sided React/Firebase prototype into a production two-sided NIL marketplace where **Athletes** and **Brands/Businesses** can discover each other, message, negotiate deals, sign contracts, and transact money safely.

This document covers:

1. High-level architecture and recommended stack
2. Authentication, identity, and roles
3. Full database schema (every collection, every field)
4. Payment workflow (Stripe Connect + escrow + fees + tax forms)
5. Messaging, deals, and contracts
6. Search and discovery
7. Notifications
8. NIL compliance (school/conference disclosures, age, KYC)
9. Security rules, Cloud Functions API surface, and rate limits
10. Admin / moderation tooling
11. Build roadmap (what to ship first)
12. **Copy-paste Claude prompts** for every module so a developer can hand each section to Claude Code and get working code

---

## 1. Architecture Overview

### 1.1 Recommended Stack

The current code already uses Firebase Auth, Firestore, and Firebase Storage. Stay on Firebase — it gives you auth, real-time DB, storage, hosting, and serverless functions in one place. Add a few specialized services on top.

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind (already in repo) | Already built |
| Auth | Firebase Auth (email/password, Google, phone OTP) | Already integrated |
| Database | Cloud Firestore (primary) + Firebase Realtime DB (presence/typing only) | Real-time, scales, security rules |
| File storage | Firebase Storage | Profile photos, contract PDFs, brand logos, athlete media |
| Server logic | Firebase Cloud Functions (2nd gen, Node 20) | Stripe webhooks, KYC, deal state machine, notifications |
| Payments | Stripe Connect (Express accounts for athletes) + Stripe Tax + Stripe Identity | Marketplace payouts, escrow via PaymentIntents, 1099-K, KYC |
| E-signatures | Dropbox Sign API (formerly HelloSign) or DocuSign | Signed NIL contracts |
| Search | Algolia (recommended) or Typesense Cloud | Discovery filtering by sport, school, follower count, sport, price |
| Email | Resend or SendGrid | Transactional emails |
| Push / SMS | Firebase Cloud Messaging + Twilio | Mobile push, SMS verification, deal alerts |
| Realtime chat | Firestore subcollection + FCM for offline push | Built-in real-time |
| Analytics | PostHog or Mixpanel + Firebase Analytics | Product analytics |
| Error monitoring | Sentry | Frontend + Functions |
| AI features | Existing Gemini integration (NIL valuation, contract review, chatbot) | Already built |

### 1.2 Topology

```
┌──────────────┐      ┌────────────────────────────────────────────┐
│  React SPA   │◄────►│  Firebase Auth                              │
│  (Vite)      │      └────────────────────────────────────────────┘
│              │      ┌────────────────────────────────────────────┐
│              │◄────►│  Firestore (real-time listeners)            │
│              │      └────────────────────────────────────────────┘
│              │      ┌────────────────────────────────────────────┐
│              │─────►│  Cloud Functions (HTTPS callable + triggers)│
│              │      │   ├─ stripe-webhook                          │
│              │      │   ├─ create-payment-intent                   │
│              │      │   ├─ release-escrow                          │
│              │      │   ├─ kyc-onboarding-link                     │
│              │      │   ├─ esign-create-request                    │
│              │      │   ├─ algolia-sync (Firestore trigger)        │
│              │      │   ├─ on-deal-status-change                   │
│              │      │   ├─ on-message-create                       │
│              │      │   └─ admin-*                                 │
│              │      └────────────────────────────────────────────┘
│              │      ┌────────────────────────────────────────────┐
│              │◄────►│  Firebase Storage (signed URLs)             │
└──────────────┘      └────────────────────────────────────────────┘
                              │
                              ▼
            ┌──────────────┬──────────────┬──────────────┐
            │   Stripe     │   Algolia    │  Dropbox Sign │
            │  Connect     │   Search     │  E-signature   │
            └──────────────┘──────────────┘──────────────┘
```

### 1.3 Core principles

- **All money-touching code lives in Cloud Functions**, never the client. The client never knows the platform fee math, never calls Stripe directly, never marks a deal "paid".
- **Firestore is the source of truth** for reads. Cloud Functions are the only writers for sensitive collections (`payments`, `escrow`, `contracts`, `complianceFilings`).
- **Two parallel role profiles**: every user has one record in `users/{uid}` plus exactly one record in either `athletes/{uid}` or `brands/{uid}`. Switching roles requires admin approval.
- **State machines, not flags**: Deals, payments, and contracts move through enumerated states; transitions are audited.

---

## 2. Authentication, Identity, and Roles

### 2.1 Sign-up flow

1. User picks a role on the landing page: **I'm an athlete** or **I'm a business**.
2. Firebase Auth account is created (email + password, Google, or Apple). Email must be verified within 7 days or the account is locked from messaging/payments.
3. The role is written to a custom claim (`role: "athlete" | "brand" | "admin"`) by a Cloud Function (`onUserCreate`). Custom claims are required for security rules to differentiate behavior.
4. Profile setup wizard collects role-specific data and writes to `athletes/{uid}` or `brands/{uid}`.
5. **Athletes**: must complete Stripe Identity verification (date of birth, photo ID) before they can be paid.
6. **Brands**: must complete a business KYC step (legal entity name, EIN, website) before they can fund a deal.

### 2.2 Identity & verification levels

| Level | What unlocks | How |
|---|---|---|
| `email_verified` | View profiles, send 1 intro message per athlete | Firebase email verification link |
| `phone_verified` | Unlimited messaging | Firebase phone OTP |
| `id_verified` (athlete only) | Receive payments, sign contracts | Stripe Identity |
| `school_verified` (athlete only) | "Verified Athlete" badge | .edu email match OR upload of student ID OR roster scrape |
| `business_verified` (brand only) | Fund deals, post offers | Stripe Connect business onboarding |

### 2.3 Multi-role users (rare)

Some athletes may eventually start their own brands. Allow a single Firebase user to have both an `athletes/{uid}` and a `brands/{uid}` record — but only with admin approval. Add a `users/{uid}.activeRole` field that the UI uses to render the right dashboard, and let users toggle.

---

## 3. Database Schema

All times are Firestore `Timestamp`. All IDs are Firebase Auth UIDs unless noted. JSON below is illustrative — types are TypeScript.

### 3.1 `users/{uid}` — root identity record

Created by a Cloud Function on auth user create. **Client cannot write to this collection** except through callable functions.

```ts
type User = {
  uid: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  role: "athlete" | "brand" | "admin";
  activeRole: "athlete" | "brand";   // for dual-role accounts
  status: "active" | "suspended" | "banned" | "pending_review";
  displayName: string;
  photoUrl?: string;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
  flags: {
    idVerified: boolean;
    schoolVerified: boolean;
    businessVerified: boolean;
    onboardingComplete: boolean;
  };
  notificationPrefs: {
    email: { messages: boolean; offers: boolean; payments: boolean; marketing: boolean };
    push:  { messages: boolean; offers: boolean; payments: boolean };
    sms:   { messages: boolean; offers: boolean; payments: boolean };
  };
  blockedUserIds: string[];   // for harassment blocking
};
```

### 3.2 `athletes/{uid}` — athlete profile

Already partially exists. Extend with the fields below.

```ts
type Athlete = {
  uid: string;
  name: string;
  email: string;
  bio?: string;            // <500 chars
  photoUrl?: string;
  coverPhotoUrl?: string;

  // Sport
  sport: string;
  position?: string;
  jerseyNumber?: string;
  year: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Grad" | "5th Year";
  university: string;
  universityId: string;     // FK to schools/{id}
  conference?: string;
  graduationYear?: number;

  // Demographics (for brand matching, never publicly displayed without consent)
  dateOfBirth?: Timestamp;  // private
  hometown?: string;
  gender?: "male" | "female" | "nonbinary" | "prefer_not_to_say";
  ethnicity?: string[];     // optional, self-reported

  // Social
  socials: {
    instagram?: { handle: string; followers?: number; verifiedAt?: Timestamp };
    tiktok?:    { handle: string; followers?: number; verifiedAt?: Timestamp };
    twitter?:   { handle: string; followers?: number; verifiedAt?: Timestamp };
    youtube?:   { handle: string; subscribers?: number; verifiedAt?: Timestamp };
    twitch?:    { handle: string; followers?: number; verifiedAt?: Timestamp };
  };
  totalReach: number;        // denormalized sum, computed by Cloud Function

  // Marketplace
  isAvailable: boolean;
  acceptsCategories: string[];   // ["apparel","food","local","crypto",...]
  preferredDealTypes: ("post" | "story" | "reel" | "appearance" | "autograph" | "ambassador" | "merchandise")[];
  minDealAmountCents: number;    // e.g., 5000 = $50
  rateCard?: {
    instagramPostCents?: number;
    instagramStoryCents?: number;
    tiktokVideoCents?: number;
    appearance1hrCents?: number;
    autographCents?: number;
  };

  // Trust & flags
  isVerified: boolean;       // school + ID verified
  rating: number;            // 0-5, denormalized
  reviewCount: number;
  completedDealsCount: number;
  responseRateLast30d: number;       // 0-1
  medianResponseHours: number;

  // Compliance
  schoolComplianceContactEmail?: string;
  agentRepresented: boolean;
  agencyName?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchKeywords: string[];   // lowercased keywords for Firestore-side search; Algolia mirrors this
};
```

### 3.3 `brands/{uid}` — brand profile

```ts
type Brand = {
  uid: string;
  legalName: string;        // "Acme Athletics Inc."
  displayName: string;      // "Acme"
  email: string;
  bio?: string;
  photoUrl?: string;        // logo
  coverPhotoUrl?: string;
  website?: string;
  industry: string;         // "Apparel" | "Food & Beverage" | ...
  industryTags: string[];

  hqAddress?: {
    line1: string; line2?: string; city: string; region: string; postal: string; country: string;
  };

  // KYC / business
  legalEntityType?: "llc" | "c_corp" | "s_corp" | "sole_prop" | "nonprofit";
  ein?: string;              // encrypted, never returned to client
  einLast4?: string;         // safe to display
  stripeAccountId?: string;  // Stripe Connect Custom or Standard account
  businessVerified: boolean;

  // Targeting preferences
  targetSports: string[];
  targetConferences: string[];
  targetGenders: string[];
  targetSchools: string[];     // empty = any
  campaignBudgetMonthlyCents?: number;

  // Trust
  rating: number;
  reviewCount: number;
  completedDealsCount: number;
  totalSpentCents: number;     // denormalized

  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

### 3.4 `schools/{schoolId}` — reference data

```ts
type School = {
  id: string;
  name: string;            // "University of Texas at Austin"
  shortName: string;       // "Texas"
  conference: string;      // "SEC"
  division: "FBS" | "FCS" | "D2" | "D3" | "NAIA" | "JUCO";
  state: string;
  emailDomains: string[];  // ["utexas.edu", "my.utexas.edu"] — used for school verification
  complianceContactEmail?: string;
  nilPolicyUrl?: string;
  logoUrl?: string;
};
```

### 3.5 `conversations/{conversationId}` and `conversations/{conversationId}/messages/{messageId}`

Pairwise chat. `conversationId` is deterministic: `${minUid}_${maxUid}` so it's idempotent.

```ts
type Conversation = {
  id: string;
  participantUids: [string, string];      // [athleteUid, brandUid]
  participantRoles: { [uid: string]: "athlete" | "brand" };
  athleteUid: string;
  brandUid: string;
  lastMessage: {
    text: string;
    senderUid: string;
    sentAt: Timestamp;
    type: "text" | "offer" | "system";
  };
  unreadCounts: { [uid: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived: { [uid: string]: boolean };
  blocked: boolean;        // either side blocked the other
  associatedDealIds: string[];
};

type Message = {
  id: string;
  senderUid: string;
  type: "text" | "offer" | "counter_offer" | "system" | "attachment";
  text?: string;             // <2000 chars
  attachmentUrl?: string;    // Firebase Storage URL
  attachmentMime?: string;
  offerId?: string;          // FK to deals/{dealId} for type="offer"|"counter_offer"
  sentAt: Timestamp;
  readBy: { [uid: string]: Timestamp };
  edited: boolean;
  deleted: boolean;
};
```

### 3.6 `deals/{dealId}` — offers, counter-offers, signed NIL deals

This replaces and extends the current `Deal` schema. A deal is a state machine.

```ts
type Deal = {
  id: string;
  athleteUid: string;
  brandUid: string;
  conversationId: string;

  title: string;                          // "1 IG post + 1 Story"
  description: string;                    // <2000 chars
  category: "post" | "story" | "reel" | "appearance" | "autograph" | "ambassador" | "merchandise" | "other";
  deliverables: Deliverable[];

  // Money
  amountCents: number;                    // gross, before fee
  platformFeeCents: number;               // computed server-side
  athletePayoutCents: number;             // amount - fee
  currency: "USD";

  // Schedule
  proposedStartDate?: Timestamp;
  proposedEndDate?: Timestamp;

  // Status (state machine — see §5)
  status:
    | "draft"
    | "pending_athlete_review"
    | "counter_offered"
    | "accepted"
    | "rejected"
    | "withdrawn"
    | "awaiting_funding"
    | "funded"
    | "in_progress"
    | "deliverables_submitted"
    | "completed"
    | "disputed"
    | "cancelled"
    | "refunded";

  // Compliance
  schoolComplianceFilingId?: string;
  requiresDisclosure: boolean;
  disclosureCompleted: boolean;

  // Contract (e-signature)
  contractId?: string;
  signedByAthleteAt?: Timestamp;
  signedByBrandAt?: Timestamp;

  // Payment
  paymentIntentId?: string;             // Stripe PaymentIntent
  escrowId?: string;                    // FK to escrow/{escrowId}
  fundedAt?: Timestamp;
  releasedAt?: Timestamp;
  refundedAt?: Timestamp;

  // History
  history: DealEvent[];                 // append-only

  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;                // offer expires if not accepted
};

type Deliverable = {
  id: string;
  description: string;             // "1 Instagram in-feed post"
  platform?: "instagram" | "tiktok" | "twitter" | "youtube" | "in_person" | "other";
  dueAt?: Timestamp;
  proofUrl?: string;               // submitted by athlete
  proofSubmittedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;             // brand uid
  status: "pending" | "submitted" | "approved" | "rejected";
};

type DealEvent = {
  at: Timestamp;
  byUid: string;
  type: "created" | "counter" | "accepted" | "rejected" | "funded" | "deliverable_submitted" | "deliverable_approved" | "released" | "disputed" | "cancelled" | "refunded" | "comment";
  payload?: Record<string, unknown>;
};
```

### 3.7 `contracts/{contractId}`

```ts
type Contract = {
  id: string;
  dealId: string;
  athleteUid: string;
  brandUid: string;
  templateVersion: string;          // versioned contract template
  pdfUrl: string;                   // Storage path
  esignProvider: "dropbox_sign" | "docusign";
  esignRequestId: string;
  status: "draft" | "sent" | "athlete_signed" | "brand_signed" | "fully_signed" | "voided";
  athleteSignedAt?: Timestamp;
  brandSignedAt?: Timestamp;
  voidedAt?: Timestamp;
  voidReason?: string;
  createdAt: Timestamp;
};
```

### 3.8 `payments/{paymentId}` and `escrow/{escrowId}`

**Client-readable, Cloud-Function-writable only.**

```ts
type Payment = {
  id: string;                      // == Stripe PaymentIntent id
  dealId: string;
  payerBrandUid: string;
  recipientAthleteUid: string;
  amountCents: number;
  platformFeeCents: number;
  athletePayoutCents: number;
  currency: "USD";
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  stripeTransferId?: string;       // when funds move to athlete's connected account
  status: "requires_payment_method" | "requires_confirmation" | "processing" | "succeeded" | "canceled" | "failed" | "refunded" | "partially_refunded";
  failureReason?: string;
  createdAt: Timestamp;
  succeededAt?: Timestamp;
};

type Escrow = {
  id: string;
  dealId: string;
  paymentId: string;
  amountCents: number;
  state: "held" | "released" | "refunded" | "disputed";
  heldAt: Timestamp;
  releasedAt?: Timestamp;
  refundedAt?: Timestamp;
  releaseTrigger?: "manual_brand_approval" | "auto_after_72h_no_dispute" | "admin_override";
};
```

### 3.9 `payouts/{payoutId}` (Stripe payouts to athlete bank)

```ts
type Payout = {
  id: string;                       // == Stripe Payout id
  athleteUid: string;
  stripeAccountId: string;
  amountCents: number;
  status: "pending" | "in_transit" | "paid" | "failed" | "canceled";
  arrivalDate: Timestamp;
  bankLast4: string;
  createdAt: Timestamp;
};
```

### 3.10 `taxDocuments/{docId}`

```ts
type TaxDocument = {
  id: string;
  uid: string;                  // athlete or brand
  taxYear: number;
  type: "w9" | "1099_k" | "1099_nec" | "w8ben";
  status: "pending" | "filed" | "delivered";
  storagePath: string;          // private storage bucket
  generatedAt: Timestamp;
  deliveredAt?: Timestamp;
};
```

### 3.11 `reviews/{reviewId}`

```ts
type Review = {
  id: string;
  dealId: string;
  reviewerUid: string;
  reviewerRole: "athlete" | "brand";
  subjectUid: string;
  rating: number;       // 1-5
  text?: string;        // <1000 chars
  createdAt: Timestamp;
  hidden: boolean;      // moderation
};
```

### 3.12 `notifications/{notificationId}`

```ts
type Notification = {
  id: string;
  uid: string;
  type: "new_message" | "new_offer" | "offer_accepted" | "offer_rejected" | "payment_received" | "payout_arrived" | "deal_completed" | "review_received" | "compliance_action_required" | "admin";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Timestamp;
};
```

### 3.13 `reports/{reportId}` — moderation

```ts
type Report = {
  id: string;
  reporterUid: string;
  subjectUid: string;
  subjectType: "user" | "message" | "deal" | "review";
  subjectId: string;
  reason: "spam" | "harassment" | "fraud" | "underage" | "compliance" | "other";
  details?: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolutionNotes?: string;
};
```

### 3.14 `complianceFilings/{filingId}`

NIL deals must often be reported to the athlete's school/conference. This is the audit log.

```ts
type ComplianceFiling = {
  id: string;
  dealId: string;
  athleteUid: string;
  schoolId: string;
  brandUid: string;
  amountCents: number;
  filedAt: Timestamp;
  filingMethod: "email" | "manual" | "api";
  acknowledgedAt?: Timestamp;
  schoolReferenceId?: string;
};
```

### 3.15 `analyses/{analysisId}` — AI contract analysis (already exists)

Keep current shape; add `dealId?: string` so analyses can be tied to a specific deal.

### 3.16 `auditLogs/{logId}` — immutable

Every state-change on a deal, payment, profile field touched by an admin, or moderation action lands here. Cloud-Function-only writes.

```ts
type AuditLog = {
  id: string;
  actorUid: string;
  actorRole: "athlete" | "brand" | "admin" | "system";
  action: string;             // e.g., "deal.fund", "user.suspend"
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  at: Timestamp;
};
```

---

## 4. State Machines

### 4.1 Deal lifecycle

```
draft
  └─► pending_athlete_review
        ├─► counter_offered ─► pending_athlete_review (loop, brand re-counters)
        ├─► rejected (terminal)
        ├─► withdrawn (terminal)
        └─► accepted
              └─► awaiting_funding
                    └─► funded ─► in_progress
                          ├─► deliverables_submitted
                          │     ├─► completed (terminal, payout released)
                          │     └─► disputed
                          │           ├─► completed (terminal)
                          │           └─► refunded (terminal)
                          └─► cancelled ─► refunded (terminal)
```

Only Cloud Functions can move a deal between states. Each transition writes an `auditLogs` entry and a `DealEvent` to `deal.history`.

### 4.2 Allowed transitions table (enforced server-side)

| From | To | Who | Side effects |
|---|---|---|---|
| draft → pending_athlete_review | brand | send notification, create message in conversation |
| pending_athlete_review → counter_offered | athlete | clone with new amount |
| pending_athlete_review → accepted | athlete | trigger e-sign request, set status awaiting_funding |
| accepted → awaiting_funding | system | (auto) |
| awaiting_funding → funded | system (Stripe webhook) | create escrow, notify athlete |
| funded → in_progress | system (auto on contract fully signed) | start due-date timers |
| in_progress → deliverables_submitted | athlete | each deliverable has its own substate |
| deliverables_submitted → completed | brand approves OR auto after 72h no action | release escrow → Stripe Transfer → payout |
| any → disputed | athlete or brand | freezes escrow, opens admin ticket |
| disputed → completed | admin | release |
| disputed → refunded | admin | refund Stripe charge |

---

## 5. Payment Workflow (Stripe Connect + Escrow)

### 5.1 Account model

- **Athletes** = Stripe Connect **Express** connected accounts (Stripe handles their KYC, 1099-K, payouts to their bank).
- **Brands** = Stripe customers in your platform account (cards or ACH on file). For brands that need invoices/EIN, you can also create them as connected accounts, but the simpler route is treating them as customers.
- **Platform** = your Stripe account, holds escrow as available balance.

### 5.2 Onboarding sequence

1. Athlete finishes profile setup → frontend calls Cloud Function `createAthleteStripeAccount`.
2. Function calls `stripe.accounts.create({ type: "express", country: "US", capabilities: { transfers: { requested: true } } })`, stores `stripeAccountId` on `athletes/{uid}` in a private subdoc not exposed to client.
3. Function returns an account-link URL → athlete completes Stripe-hosted onboarding (DOB, SSN last 4, bank).
4. Stripe webhook `account.updated` flips `flags.idVerified = true` on `users/{uid}` once `charges_enabled && payouts_enabled`.

For brands the equivalent is `setupIntent` for adding a card/ACH source, then a small business KYC check (Stripe can do this via Stripe Identity or you can validate EIN against the IRS TIN match API).

### 5.3 Funding a deal (the escrow flow)

```
1. Athlete accepts offer → deal.status = accepted
2. Cloud Function generates contract → Dropbox Sign request
3. Both parties e-sign → contract.status = fully_signed → deal.status = awaiting_funding
4. Brand clicks "Fund deal" → frontend calls callable createDealPaymentIntent({ dealId })
5. Function:
     - re-validates dealId, brandUid == auth.uid
     - computes platformFeeCents = round(amount * 0.10)   // 10% take rate
     - creates Stripe PaymentIntent:
         amount: amountCents,
         currency: "usd",
         customer: brandStripeCustomerId,
         payment_method_types: ["card", "us_bank_account"],
         metadata: { dealId, athleteUid, brandUid },
         transfer_group: `deal_${dealId}`
6. Frontend confirms PaymentIntent with Stripe.js (PCI scope: SAQ-A)
7. Stripe webhook `payment_intent.succeeded` →
     - create payments/{pi_id}, escrow/{escrowId}
     - deal.status = funded
     - notify athlete
8. Athlete delivers, marks deliverables submitted
9. Brand approves all deliverables (or 72h auto-approve elapses) →
     Cloud Function releaseEscrow:
       - stripe.transfers.create({
           amount: athletePayoutCents,
           currency: "usd",
           destination: athlete.stripeAccountId,
           transfer_group: `deal_${dealId}`,
           source_transaction: chargeId
         })
       - deal.status = completed
       - escrow.state = released
       - 1099-NEC tracking incremented for athlete tax year
10. Stripe automatically pays out to athlete's bank on the schedule (default 2-day rolling)
```

### 5.4 Fee math (single source of truth, in Cloud Functions)

```ts
const PLATFORM_FEE_BPS = 1000; // 10.00%

export function computeFees(amountCents: number) {
  if (amountCents < 100) throw new Error("min $1");
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_BPS / 10_000);
  const athletePayoutCents = amountCents - platformFeeCents;
  return { platformFeeCents, athletePayoutCents };
}
```

### 5.5 Disputes & refunds

- Either party can raise a dispute within 14 days of `deliverables_submitted`. Sets `deal.status = disputed`, freezes escrow.
- Admin reviews via admin tool, can `releaseEscrow` or `refundDeal`.
- A refund hits Stripe via `stripe.refunds.create({ payment_intent })`. Webhook `charge.refunded` flips state.

### 5.6 Tax forms

- Stripe Connect issues **1099-K** to athletes automatically when thresholds are met (federal: $5k for 2024, dropping). Configure via Stripe dashboard.
- Platform issues **1099-NEC** to athletes for service income via Stripe Tax or via your own CPA-delivered process. Trigger: cron Cloud Function on Jan 15 of each year aggregates `payments` per athlete for the prior tax year and creates `taxDocuments` records.
- Athletes upload **W-9** before first payout (collected during Stripe onboarding).
- International athletes need **W-8BEN** — same flow, different form.

### 5.7 Refund + fee reversal rules

| Scenario | Stripe action | Platform fee |
|---|---|---|
| Brand cancels before funded | none | n/a |
| Brand cancels after funded, before athlete starts | full refund | platform fee returned |
| Both agree to cancel mid-work | partial refund split as agreed | platform fee prorated |
| Athlete fails to deliver, brand wins dispute | full refund | platform fee returned |
| Brand fails to approve, athlete wins dispute | release to athlete | platform keeps fee |

---

## 6. Messaging

### 6.1 Real-time

Use Firestore `onSnapshot` on `conversations/{id}/messages` ordered by `sentAt desc, limit(50)`. For typing indicators and presence use Realtime DB (`/presence/{uid}`) — Firestore is too expensive for that.

### 6.2 Conversation creation

- Brand views athlete profile → clicks "Message" → frontend calls callable `getOrCreateConversation({ otherUid })`.
- Function checks both users exist, are not blocked, computes deterministic `conversationId = sortedUids.join("_")`, upserts the conversation doc.
- A Cloud Function trigger `onMessageCreate` updates `conversation.lastMessage` and `unreadCounts`.

### 6.3 Embedded offers

Messages of type `offer` link to a `deals/{dealId}` doc in `draft` or `pending_athlete_review`. Renders inline in the chat as a card with Accept / Counter / Reject buttons. Each action calls a callable function that mutates the deal.

### 6.4 Anti-abuse

- Rate-limit: max 30 messages/minute/user (App Check + Functions middleware).
- New brand → new athlete: first message goes to a "Requests" inbox, not main chat, until athlete opens it. Prevents spam.
- Profanity / PII filter (server-side regex + Perspective API) before write — flagged messages are still delivered but tagged for admin review.

---

## 7. Search & Discovery

### 7.1 Why Algolia / Typesense

Firestore has no full-text search and no `OR` across fields. Athletes need filtering by sport AND school AND follower-range AND availability AND price-range. Algolia handles this in <50ms.

### 7.2 Indexed fields (athletes index)

```
objectID = uid
name, sport, position, university, conference, year
gender, totalReach, completedDealsCount, rating
acceptsCategories, preferredDealTypes
minDealAmountCents
isAvailable, isVerified, schoolVerified
photoUrl, bio
location.geoloc (if collected)
```

### 7.3 Sync

- Cloud Function trigger `onAthleteWrite` mirrors changes to Algolia.
- Public-safe fields only — never PII like DOB, email, address, EIN.
- Brand index is similar but smaller (mostly used for athlete to research who's offered them a deal).

### 7.4 Ranking

Tie-breakers: `isVerified DESC`, `completedDealsCount DESC`, `rating DESC`, `totalReach DESC`. Personalize by brand's `targetSports` / `targetConferences` filters.

---

## 8. Notifications

### 8.1 Channels

- In-app: write to `notifications/{id}` and listen via `onSnapshot`.
- Email: Resend templates for new_message digest (hourly), new_offer (immediate), payment_received (immediate), weekly_summary.
- Push: Firebase Cloud Messaging for mobile (later).
- SMS: Twilio for high-priority only (payment received, urgent compliance).

### 8.2 Cloud Function triggers

- `onMessageCreate` → notify recipient
- `onDealStatusChange` → notify counterparty
- `onPaymentSuccess` → notify both, send receipt email
- `onPayoutPaid` → notify athlete
- Scheduled `dailyDigest` (cron) → daily summary

---

## 9. NIL Compliance

This is the part most NIL platforms get wrong and is a competitive moat.

### 9.1 What's required

- **NCAA**: athlete must disclose NIL deals to their school's compliance office before or shortly after signing. Most schools have a portal (INFLCR, Opendorse, Influencer, Teamworks) — you can either email a CSV nightly, or integrate via API where one exists.
- **State NIL laws**: vary per state (e.g., Texas, Florida, California each have rules). Block deals with prohibited categories (alcohol, gambling, tobacco, cannabis, adult, firearms) by default.
- **Boosters**: deals from a school's booster organization to an athlete at that school are heavily scrutinized. Flag any brand whose contact email matches a school's domain.
- **Age**: high-school athletes have stricter rules per state. Default to college-only for v1.

### 9.2 Implementation

```
Cloud Function fileCompliance(dealId):
  1. Look up athlete.universityId, get schools/{id}
  2. Generate compliance PDF (deal summary)
  3. Email to school.complianceContactEmail
  4. Create complianceFilings/{id}
  5. Mark deal.disclosureCompleted = false (pending)
  6. School replies → admin marks acknowledgedAt, deal.disclosureCompleted = true
```

### 9.3 Prohibited content engine

Server-side validator on deal creation checks `category` and brand `industryTags` against a `restrictedCategories[]` config in Remote Config. Reject with reason at the function level — never let the deal hit Firestore.

---

## 10. Security Rules & Cloud Functions API

### 10.1 Security rules — design rules

- Default-deny.
- Use `request.auth.token.role` (custom claim) to gate by role — far cheaper than reading user doc.
- `payments`, `escrow`, `payouts`, `complianceFilings`, `auditLogs`, `users` are **read-only** to clients (and only to the relevant uid). All writes via Cloud Functions.
- `athletes`, `brands` editable only by owner; certain fields (`isVerified`, `rating`, `totalReach`, `completedDealsCount`, `searchKeywords`) are denylisted from client writes — only the server can set them.
- Validation rules check field types, length, enum membership, and `request.resource.data.diff(resource.data).affectedKeys()` to enforce immutable fields like `createdAt` and `uid`.

### 10.2 Cloud Functions API surface (callable + HTTPS)

Callable (auth required, App Check enforced):

```
auth.onCreate                    → write users/{uid}, set custom claim role
auth.onDelete                    → soft-delete profile

profile.completeOnboarding       → mark flags.onboardingComplete
profile.requestSchoolVerification → start .edu email or ID verification
profile.startStripeOnboarding    → returns Stripe account-link URL

discovery.searchAthletes         → proxies Algolia with brand-scoped filters
discovery.recordProfileView      → analytics

messaging.getOrCreateConversation
messaging.markRead
messaging.blockUser
messaging.reportMessage

deals.create                     → brand creates draft offer
deals.counter                    → either side counters
deals.accept                     → athlete accepts → triggers contract
deals.reject
deals.withdraw
deals.fund                       → returns Stripe PaymentIntent client secret
deals.submitDeliverable          → athlete uploads proof
deals.approveDeliverable
deals.dispute
deals.cancel

contracts.createEsignRequest
contracts.handleEsignWebhook (HTTPS, signed by Dropbox Sign)

payments.handleStripeWebhook (HTTPS, signed by Stripe)
payments.releaseEscrow           → admin or auto-trigger
payments.refundDeal              → admin

reviews.create
reviews.flag

compliance.fileForDeal
compliance.markAcknowledged      → admin

admin.suspendUser
admin.banUser
admin.releaseEscrow
admin.refundDeal
admin.resolveDispute
admin.editProfileField
```

HTTPS triggers (no auth, signed):

```
POST /webhooks/stripe        → Stripe-Signature header verified
POST /webhooks/dropbox-sign
POST /webhooks/algolia (none — outbound only)
```

Firestore triggers:

```
onAthleteWrite        → Algolia sync, totalReach recompute
onBrandWrite          → Algolia sync
onMessageCreate       → notifications, conversation update
onDealWrite           → audit log, history append
onReviewCreate        → recompute aggregate rating
```

### 10.3 Rate limits

Use a Cloud Function middleware backed by a tiny Firestore counter or Redis (Upstash):

| Endpoint | Limit |
|---|---|
| messaging.send | 30/min/user |
| deals.create | 20/day/brand |
| profile.updateAthlete | 60/hour |
| discovery.searchAthletes | 120/min/user |

---

## 11. Admin / Moderation

A separate React route at `/admin` gated by `users/{uid}.role == "admin"`. Capabilities:

- Search and impersonate (read-only) any user.
- View all deals, payments, escrow holds, disputes.
- Release / refund any escrow (writes to `auditLogs`).
- Suspend / ban a user (sets `users/{uid}.status`, propagates to security rules).
- View moderation queue (`reports` where `status == open`).
- View compliance queue (`complianceFilings` where `acknowledgedAt == null` and `filedAt < now - 7d`).
- Edit any profile field with audit trail.
- Push announcements (writes to `notifications` for all users).

---

## 12. Build Roadmap

Suggested order (each step is a real shippable milestone):

1. **Roles + onboarding** — split signup into athlete vs brand, custom claims, profile setup wizard for both, school verification.
2. **Discovery** — Algolia index of athletes, search/filter UI for brands, brand listing for athletes.
3. **Messaging** — conversations + messages, inbox UI, blocking.
4. **Deals** — offer card in chat, draft → accept/reject/counter state machine, no money yet.
5. **E-signature integration** — generate PDF, Dropbox Sign request, store contract.
6. **Stripe Connect** — athlete onboarding, brand cards, **escrow funding flow end-to-end**.
7. **Deliverables + escrow release** — mark submitted, brand approves, auto-release after 72h.
8. **Reviews + ratings** — bidirectional 5-star reviews after `completed`.
9. **NIL compliance filings** — auto-email school compliance officer on each funded deal.
10. **Notifications** — email + in-app, then push later.
11. **Admin + moderation tools**.
12. **Tax docs** — 1099-NEC generation Jan 15.
13. **Mobile push (FCM) + iOS/Android wrappers** — final.

---

## 13. Per-Module Claude Prompts

Paste each prompt below into Claude Code (or any Claude-powered IDE) to develop that module. Each prompt assumes the developer is in the repo root and has read this whole document.

> **Tip**: prepend each prompt with `Read /BACKEND_ARCHITECTURE.md first, then implement.` That keeps Claude grounded in the schema you just defined.

### 13.1 Auth + roles + onboarding

```
You are working in the bluechipNIL-main repo. Read BACKEND_ARCHITECTURE.md (sections 2 and 3.1–3.4) before starting.

Implement role-based authentication on top of the existing Firebase Auth setup:

1. Add a Cloud Function (functions/src/auth/onUserCreate.ts) triggered on auth.user().onCreate that:
   - Creates a users/{uid} doc with role inferred from a `pendingRole` field stashed in customClaims by the signup form, defaulting to "athlete".
   - Sets a custom claim {role, activeRole}.
   - Sends a verification email via the existing Firebase template.
2. On the React side, add a role-picker step before email/password fields: "I'm an athlete" or "I'm a business". Persist the chosen role to localStorage, and pass it to the signup callable `auth.setPendingRole({role})` immediately after createUserWithEmailAndPassword.
3. After login, force a token refresh (auth.currentUser.getIdToken(true)) so custom claims arrive.
4. Update src/App.tsx routing: athletes go to /athlete-dashboard, brands go to /brand-dashboard, neither sees the other's UI.
5. Add a profile-completion gate: if users/{uid}.flags.onboardingComplete is false, redirect to /onboarding which renders AthleteProfileWizard.tsx or BrandProfileWizard.tsx based on role.
6. Write Firestore security rules for users/{uid} per BACKEND_ARCHITECTURE.md §10.1: read=owner+admin, write=server-only.
7. Add a Cypress (or Playwright) test that signs up as athlete, completes onboarding, and verifies Firestore docs and custom claim.

Use TypeScript everywhere. Match the existing code style. Do not break existing components. Run `npm run lint` and `firebase emulators:exec --only auth,firestore,functions "npm test"` before reporting done.
```

### 13.2 Athlete profile (extended) + Brand profile

```
Read BACKEND_ARCHITECTURE.md §3.2 (Athlete) and §3.3 (Brand).

Replace the current AthleteProfile.tsx and ProfileSetup.tsx with a multi-step wizard that captures every field in the Athlete schema. Use the existing Tailwind look. Steps:
  1. Basics (name, photo, bio, hometown)
  2. Sport (sport, position, year, school dropdown from schools collection, jersey #)
  3. Socials (handles + verification badges)
  4. Marketplace (rate card, accepts categories, preferred deal types, min deal amount, availability toggle)
  5. Identity (birth date private, agent represented?)
  6. Submit → writes athletes/{uid}, sets users/{uid}.flags.onboardingComplete=true via callable function.

Do the equivalent for BrandProfileWizard.tsx (legalName, displayName, logo, website, industry, HQ address, target sports/conferences, monthly budget). Persist EIN via callable function brand.setEIN(ein) which encrypts at-rest and stores einLast4 publicly.

Update Firestore rules to validate every new field per the schema's types, lengths, and enums. Reject writes to server-managed fields (isVerified, rating, completedDealsCount, totalReach, searchKeywords).

Add a Cloud Function onAthleteWrite that recomputes totalReach = sum of socials.followers and writes searchKeywords (lowercased tokens of name, sport, position, university). Same for brands.

Run lint and emulator tests.
```

### 13.3 Discovery & search (Algolia)

```
Read BACKEND_ARCHITECTURE.md §7.

Set up Algolia:
1. Create two indices: athletes_v1, brands_v1. Configure searchable attributes, filters, ranking per the doc.
2. Cloud Function syncAthleteToAlgolia: triggered on athletes/{uid} write. Strip private fields (DOB, email if not opted in). Use ALGOLIA_ADMIN_KEY from functions config.
3. Frontend: add /search page with sidebar filters (sport, conference, school, gender, follower range slider, price range slider, verified only) and a result grid of athlete cards. Use algoliasearch and react-instantsearch-hooks. Public Algolia key only on client.
4. Cards link to /athletes/{uid} which shows the public-safe fields.
5. Brands view discovery; athletes see a /brands directory with similar UI but smaller.

Add a callable discovery.recordProfileView({viewedUid}) that increments a daily counter in analytics/{viewedUid}/days/{YYYY-MM-DD} for funnel insights.
```

### 13.4 Messaging

```
Read BACKEND_ARCHITECTURE.md §3.5 and §6.

Build a 1-to-1 messaging system:
1. Callable messaging.getOrCreateConversation({otherUid}): validates roles are different (athlete↔brand), checks not blocked, computes deterministic conversationId, upserts the conversation, returns id.
2. Callable messaging.sendMessage({conversationId, text|attachmentUrl, type}): rate-limited to 30/min, runs PII regex + Perspective API, writes to messages subcollection.
3. Cloud Function onMessageCreate: updates conversation.lastMessage, increments unreadCounts for non-sender, writes a notification doc and triggers email/push.
4. React: ChatList.tsx (left), ChatThread.tsx (right), TypingIndicator using Realtime DB /typing/{conversationId}/{uid}, MessageInput with attachment upload to Firebase Storage.
5. Block/Report buttons in the thread header. Reporting writes reports/{id} with subjectType="message".
6. Render embedded "offer" messages as a card with Accept/Counter/Reject buttons that call deal callables (built in next module).

Security rules for conversations: read+write only if request.auth.uid in resource.data.participantUids, and resource.data.blocked == false.

Tests: emulator-based test that spins up athlete + brand, sends 5 messages, blocks, expects rule denial.
```

### 13.5 Deals + offers + state machine

```
Read BACKEND_ARCHITECTURE.md §3.6 and §4.

Implement the deal state machine:
1. Define the allowed-transitions table (§4.2) as a const in functions/src/deals/transitions.ts.
2. Callables: deals.create, deals.counter, deals.accept, deals.reject, deals.withdraw, deals.cancel. Each:
   - validates auth.uid is athleteUid or brandUid
   - validates current status → next status is allowed for this role
   - in a Firestore transaction: updates status, appends history event, writes auditLog
   - on certain transitions, also emits a system message into the related conversation
3. UI: in BrandDeals.tsx and AthleteDashboard.tsx, render a deal card showing current status with action buttons that map to allowed transitions. Disable buttons for disallowed transitions.
4. Add deals.expirePendingOffers as a scheduled (cron) function: every hour, set status="rejected" on offers older than 14 days still in pending_athlete_review.
5. Security rules: deals are creatable by brand only; updatable by either party but only via Cloud Functions (rule: deny direct client writes to status/amountCents/history once status != draft).

Cover with emulator tests for every transition in §4.2.
```

### 13.6 E-signature (Dropbox Sign)

```
Read BACKEND_ARCHITECTURE.md §3.7.

Integrate Dropbox Sign:
1. Build a contract template (markdown → PDF via @react-pdf/renderer) that pulls deal fields, deliverables, athlete and brand info, fee disclosure, school disclosure language.
2. Callable contracts.requestSignatures({dealId}) — only when deal.status == accepted. Generates PDF, calls Dropbox Sign signature_request/send, writes contracts/{id}.
3. HTTPS function /webhooks/dropbox-sign verifies signature, updates contracts/{id}.status. When fully_signed, transitions deal to awaiting_funding.
4. UI: in deal detail page, show contract status and a "Sign now" link that opens the embedded signing iframe.
5. Store a copy of the signed PDF in Firebase Storage at /contracts/{contractId}.pdf with a private bucket; admin only.

Use the dropbox-sign npm package. Put DROPBOX_SIGN_API_KEY and DROPBOX_SIGN_CLIENT_ID in functions:config.
```

### 13.7 Payments — Stripe Connect + escrow

```
Read BACKEND_ARCHITECTURE.md §5 and §3.8 and §3.9 carefully.

Implement the entire money pipeline. Use the stripe npm package, version pinned. Never expose Stripe secret key to client.

1. Athlete onboarding:
   - Callable payments.createAthleteStripeAccount → stripe.accounts.create + stripe.accountLinks.create. Save stripeAccountId in a private subdoc athletes/{uid}/private/stripe.
   - Cloud Function listening on Stripe webhook event account.updated: when charges_enabled && payouts_enabled, set users/{uid}.flags.idVerified = true.
2. Brand payment method:
   - Callable payments.createSetupIntent → returns client_secret. Frontend uses Stripe Elements to add a card or US bank account, saved to a Stripe Customer attached to brandUid.
3. Funding a deal:
   - Callable deals.fund({dealId}) — only when status == awaiting_funding. Creates PaymentIntent with amount=deal.amountCents, customer=brand stripe customer, metadata={dealId, athleteUid, brandUid}, transfer_group=`deal_${dealId}`. Returns client_secret.
   - Frontend confirms via stripe.confirmPayment.
4. Webhook /webhooks/stripe (HTTPS, signature-verified):
   - payment_intent.succeeded → create payments/{pi.id}, escrow/{escrowId state=held}, deal.status=funded.
   - charge.refunded → update payments + escrow + deal.
   - payout.paid → create payouts/{id}, notify athlete.
   - account.updated → as above.
5. Escrow release:
   - Callable deals.approveDeliverable({dealId, deliverableId}). Marks deliverable approved. If all approved, calls releaseEscrow(dealId).
   - Scheduled function dealsAutoRelease: every 1h, finds deals where status=deliverables_submitted and last submission > 72h ago and no dispute → releaseEscrow.
   - releaseEscrow internal:
       stripe.transfers.create({amount: athletePayoutCents, currency:"usd", destination: athlete.stripeAccountId, transfer_group, source_transaction: chargeId})
       deal.status=completed, escrow.state=released, increment athlete.completedDealsCount, increment brand.totalSpentCents.
6. Refunds:
   - Callable admin.refundDeal({dealId, reason}) → stripe.refunds.create on the chargeId. Webhook updates state.
7. Fee math lives ONLY in functions/src/payments/fees.ts.
8. Write 12+ emulator tests covering: happy path, failed payment, partial refund, dispute → admin release, dispute → admin refund, auto-release after 72h.

Add a /billing page for brands showing payment methods, recent payments, refunds. Add a /earnings page for athletes showing pending escrow, paid out, lifetime, payout schedule. Read from payments and payouts collections via Firestore listeners.
```

### 13.8 Reviews

```
Read §3.11.

After deal.status transitions to completed, both parties unlock a one-time review of the other. Build:
1. Callable reviews.create({dealId, rating, text}). Validates deal completed and reviewer is participant and hasn't already reviewed. Writes reviews/{id}.
2. Cloud Function onReviewCreate: recomputes subject's rating (avg) and reviewCount on athletes/{uid} or brands/{uid}.
3. UI: post-deal modal "How was your experience with X?". Star input + optional text.
4. Display average + recent 5 reviews on profile.

Rules: read = anyone authenticated, create = once per (dealId, reviewerUid) — enforce with composite ID `${dealId}_${reviewerUid}`.
```

### 13.9 NIL Compliance

```
Read §9 and §3.4 and §3.14.

Build the school-disclosure pipeline:
1. Seed schools collection from a CSV of NCAA D1 schools (~360 rows) with name, conference, division, emailDomains, complianceContactEmail, nilPolicyUrl.
2. Cloud Function on deal.status transition to funded → calls compliance.fileForDeal(dealId):
   - load athlete.universityId → school
   - generate a one-page PDF summary (deal, brand, amount, deliverables, dates)
   - send email via Resend to school.complianceContactEmail with PDF attached
   - write complianceFilings/{id} with filedAt
3. Maintain a restrictedCategories array in Remote Config: ["alcohol","gambling","tobacco","cannabis","adult","firearms","sports_betting"]. deals.create rejects any deal whose category or brand.industryTags intersect that list — return error code DEAL_RESTRICTED_CATEGORY.
4. Booster detection: when brand registers, if their email domain matches any school's emailDomains[], flag the brand record needsBoosterReview=true and require admin approval before they can fund deals.
5. Admin UI tab "Compliance" lists filings where acknowledgedAt is null; admin can mark acknowledged + paste schoolReferenceId.

Tests: deal in "alcohol" category is rejected; funded deal triggers email; admin acknowledgment flips deal.disclosureCompleted true.
```

### 13.10 Notifications

```
Read §8 and §3.12.

Set up notifications:
1. Resend account, configure DKIM, store RESEND_API_KEY.
2. Cloud Function helper sendNotification(uid, type, payload): writes notifications/{id} AND respects users/{uid}.notificationPrefs to dispatch email/push/SMS.
3. Wire helper into existing triggers: onMessageCreate, onDealStatusChange, onPaymentSuccess, onPayoutPaid, onReviewCreate, onComplianceActionRequired.
4. Email templates (React Email + Resend) for each type.
5. Frontend: bell icon in header with onSnapshot listener on notifications where uid==me & read==false ordered by createdAt desc limit 20. Mark-as-read callable. Toast for new notifications.
6. Settings page: toggle channels per category.
```

### 13.11 Admin tooling

```
Read §11.

Build the admin console:
1. Restrict /admin route to users where role custom claim == "admin".
2. Pages:
   - Users (search, filter by role/status, view profile, suspend/ban with audit trail)
   - Deals (search by id/uid, view detail with full history, manual status transition, release/refund escrow)
   - Disputes queue
   - Compliance queue
   - Reports queue (moderation)
   - Audit log viewer (read-only, filter by actor/action/target)
3. All admin write actions go through admin.* callables that re-verify role server-side and write to auditLogs.
4. Use shadcn/ui Tables, Dialogs, Forms.
```

### 13.12 Tax documents

```
Read §5.6 and §3.10.

Implement annual 1099-NEC generation:
1. Scheduled function taxYearJob, cron 0 0 15 1 * (Jan 15 each year):
   - For each athlete with at least $600 in payouts during prior tax year (sum payments where succeededAt in [Jan 1, Dec 31]), generate a 1099-NEC PDF.
   - Save to taxDocuments/{id}, storagePath in private bucket.
   - Email athlete with download link (signed URL, 30-day expiry).
2. Athlete /tax-center page: list their taxDocuments with download buttons.
3. Document W-9 collection through Stripe Connect onboarding (already covered there).

Use a 1099-NEC PDF template engine; values: payer (your platform LLC, EIN), payee (athlete name + last 4 SSN from Stripe), Box 1 Nonemployee compensation = total payouts.

This is regulated; have a CPA review the template before going live.
```

---

## 14. Environment & Config

```
.env (frontend, never secret)
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_STORAGE_BUCKET=
  VITE_FIREBASE_MESSAGING_SENDER_ID=
  VITE_FIREBASE_APP_ID=
  VITE_ALGOLIA_APP_ID=
  VITE_ALGOLIA_SEARCH_KEY=     # search-only key, not admin
  VITE_STRIPE_PUBLISHABLE_KEY=

functions:config (server, secret)
  stripe.secret_key=sk_live_...
  stripe.webhook_secret=whsec_...
  algolia.admin_key=...
  resend.api_key=re_...
  dropbox_sign.api_key=...
  dropbox_sign.client_id=...
  twilio.account_sid=...
  twilio.auth_token=...
  perspective.api_key=...
  irs.tin_match_credentials=...   # optional
  encryption.key=...               # for EIN/PII encryption at rest
```

---

## 15. Cost Sanity Check (rough monthly estimate at 10k MAU, 1k deals/mo)

| Service | Cost |
|---|---|
| Firebase Auth | free up to 50k |
| Firestore | ~$80 (heavy listeners) |
| Cloud Functions | ~$60 |
| Storage | ~$10 |
| Algolia | $50–500 depending on records |
| Stripe | 2.9% + $0.30 per transaction (passed through; platform fee covers) |
| Resend | $20 |
| Twilio | usage-based, ~$30 |
| Dropbox Sign | $20–80 |
| Sentry | $26 |
| Total platform infra | ~$400–800/mo at this scale |

Platform take rate of 10% on $1M GMV = $100k/mo gross margin. Healthy.

---

## 16. Things I'd Watch Out For

- **NIL is regulated state-by-state**. Get a sports/entertainment lawyer to review your contract template and disclosure flow before going live.
- **Boosters**: this is the third rail. A deal that is actually pay-for-play disguised as NIL is a major NCAA violation that can cost an athlete eligibility and a school sanctions. Your detection + admin review process matters.
- **Minors**: if you ever expand to high-school athletes, you need parental consent flows, COPPA compliance, and stricter content moderation. Default v1 to college-only.
- **Athlete impersonation**: school verification is your moat. Don't ship discovery before school verification is locked down.
- **Money never lives on the platform.** Stripe holds funds. Your platform balance is escrow only, swept periodically. Talk to Stripe about marketplace agreements and CIP requirements.
- **Disputes will happen.** Have a written dispute policy on the site, a 14-day window, and a documented admin SOP before launch.
- **Webhooks must be idempotent**. Use the Stripe event id as a dedupe key in a `webhookEvents/{eventId}` doc.

---

## 17. What's Already Built vs What's New

**Keep**: React shell, Firebase Auth wiring, AI features (NILValuation, ContractReview, FinancialLiteracy, TaxAutopilot, BrandOptimization, Chatbot), basic schemas in `firebase-blueprint.json`, existing security rules as a starting skeleton.

**Replace/extend**: Athlete and Brand schemas (much richer), Deal schema (state machine + escrow fields), security rules (need server-only fields), all new collections in §3.

**Add new**: Cloud Functions project (functions/), Stripe Connect, Algolia, Dropbox Sign, Resend, Twilio, admin route, full messaging, NIL compliance pipeline.

The existing AI tools (contract review, NIL valuation, financial literacy) become *features inside* the marketplace rather than standalone screens — for example, surface the AI contract review automatically when a deal hits `pending_athlete_review`, and show NIL valuation as a private number on the athlete's own dashboard.

---

*End of document.*
