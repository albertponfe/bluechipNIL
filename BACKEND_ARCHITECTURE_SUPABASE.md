# BlueChip NIL — Backend Architecture & Build Plan (Supabase Edition)

A complete blueprint for turning the current Firebase prototype into a production two-sided NIL marketplace built on **Supabase + Postgres**, where Athletes and Brands discover each other, message, negotiate deals, sign contracts, and transact money safely.

**Stack chosen with you:**

- **Supabase Free tier** (with explicit upgrade triggers documented in §15)
- **Postgres full-text + pg_trgm** for search (swap to Algolia later)
- **Stripe Connect Express** for athlete payouts
- **SignWell** for e-signatures

---

## Table of Contents

1. Why Supabase fits this app
2. Architecture overview
3. Free tier limits and upgrade triggers
4. Auth, identity, and roles
5. Full Postgres schema (DDL)
6. Row Level Security (RLS) policies
7. State machines & invariants
8. Payment workflow (Stripe Connect Express + escrow)
9. Messaging (Supabase Realtime)
10. Search (Postgres FTS + pg_trgm)
11. E-signatures (SignWell)
12. Notifications
13. NIL compliance
14. Edge Functions API surface
15. Admin & moderation tools
16. Migration plan from the existing Firebase prototype
17. Build roadmap
18. Per-module Claude prompts
19. Cost projection
20. Things to watch out for

---

## 1. Why Supabase Fits This App

The current Firebase prototype works for read-heavy social apps but fights you the moment you need:

- A deal that can't be funded twice (needs a real unique constraint).
- Atomic state transitions across `deals`, `escrow`, `payments`, `audit_logs` (needs Postgres transactions).
- A query like "show me all athletes in the SEC who completed at least 3 deals in the last 90 days, ordered by rating" (needs joins + aggregates).
- 1099-NEC generation that sums payouts per athlete per tax year, exactly once (needs `SUM` + idempotency keys).

Postgres handles all of that natively. Supabase wraps Postgres with auth, real-time over WebSockets, an auto-generated REST/GraphQL API (PostgREST), Storage, and Edge Functions on Deno — most of what Firebase gave you, but with a relational core. Trade-off: you write SQL and migrations, and Realtime concurrency is tighter than Firestore (covered in §3).

---

## 2. Architecture Overview

```
┌─────────────┐    ┌────────────────────────────────────────────┐
│  React SPA  │◄──►│  Supabase Auth (GoTrue)                     │
│  Vite + TS  │    └────────────────────────────────────────────┘
│             │    ┌────────────────────────────────────────────┐
│             │◄──►│  Postgres (RLS-enforced)                    │
│             │    │   ├─ tables (§5)                            │
│             │    │   ├─ views (athlete_public, brand_public)   │
│             │    │   ├─ triggers (audit log, denormalized agg) │
│             │    │   └─ extensions: pg_trgm, pgcrypto, citext  │
│             │    └────────────────────────────────────────────┘
│             │    ┌────────────────────────────────────────────┐
│             │◄──►│  Supabase Realtime (Postgres CDC)           │
│             │    │   - chat messages, presence, deal updates  │
│             │    └────────────────────────────────────────────┘
│             │    ┌────────────────────────────────────────────┐
│             │───►│  Edge Functions (Deno, TypeScript)          │
│             │    │   ├─ stripe-webhook                         │
│             │    │   ├─ create-deal-payment-intent             │
│             │    │   ├─ release-escrow                         │
│             │    │   ├─ stripe-onboard-athlete                 │
│             │    │   ├─ signwell-create-request                │
│             │    │   ├─ signwell-webhook                       │
│             │    │   ├─ deal-transition                        │
│             │    │   ├─ compliance-file                        │
│             │    │   ├─ tax-year-job (cron)                    │
│             │    │   ├─ deals-auto-release (cron)              │
│             │    │   └─ admin-*                                │
│             │    └────────────────────────────────────────────┘
│             │    ┌────────────────────────────────────────────┐
│             │◄──►│  Supabase Storage (S3-compatible)           │
└─────────────┘    └────────────────────────────────────────────┘
        │
        ▼
   ┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
   │ Stripe │ │ SignWell │ │ Resend  │ │ Sentry   │
   │Connect │ │  e-sign  │ │ email   │ │ errors   │
   └────────┘ └──────────┘ └─────────┘ └──────────┘
```

### Core principles

- **Postgres is the source of truth.** RLS is the only authorization layer the client can talk to.
- **Money-touching code lives in Edge Functions**, never the client. Client cannot insert into `payments`, `escrow`, `payouts`, `tax_documents`, `compliance_filings`, `audit_logs`.
- **Two parallel role profiles**: every user has one `users` row plus exactly one of `athletes` or `brands`. Enforced by `CHECK` constraints + triggers.
- **State machines, not flags.** Deal/payment transitions are a single SQL function (`fn_transition_deal`) that enforces the allowed-transitions table.
- **Idempotency everywhere on money.** Stripe webhook events keyed on `stripe_event_id UNIQUE`.

### Frontend client

- `@supabase/supabase-js` v2 for auth, queries, realtime.
- TanStack Query for caching.
- React Hook Form + Zod for forms / validation.
- Stripe.js + `@stripe/react-stripe-js` for card collection.
- Tailwind + shadcn/ui (already in repo direction).

---

## 3. Free Tier Limits and Upgrade Triggers

You chose the Free tier. Here is exactly what you get and the points at which you must upgrade or you'll have an outage.

| Resource | Free | Pro ($25/mo) | Trigger to upgrade |
|---|---|---|---|
| Database size | 500 MB | 8 GB | When `pg_database_size('postgres') > 350 MB`. Set a Sentry alert. |
| File storage | 1 GB | 100 GB | When 600+ users have uploaded photos. **Mitigation**: store profile photos and contracts in Cloudflare R2 ($0 egress) from day one; only keep small thumbnails in Supabase Storage. |
| Bandwidth | 5 GB/mo | 250 GB/mo | First time you exceed in a month. |
| Concurrent DB connections | 60 (direct) / 200 (pooled) | 200 / 400 | If you see "too many connections" errors. Always use the connection pooler (port 6543). |
| Edge Function invocations | 500k/mo | 2M/mo + cheap overage | Stripe webhooks + chat events can eat this fast. |
| Auth MAU | 50,000 | 100,000 included, $0.00325/MAU after | Likely hit later than DB-size. |
| **Project auto-pauses** | **after 1 week of no activity** | never | This is the killer. **Solution**: a free GitHub Actions cron hits a `/api/ping` Edge Function every 6 hours so you never pause. |
| Backups | none | daily, 7-day retention | Upgrade before you have any paying users. **Mitigation while free**: a nightly GitHub Actions cron runs `pg_dump` to a private R2 bucket. |
| Point-in-time recovery | no | no (only on Team) | Pay only when GMV justifies it. |

**My recommended cadence:** stay on Free through closed alpha (maybe 25–50 invited users), then flip to Pro the day you take your first dollar of real money. The architecture below works identically on both — Pro is a billing decision.

### Free-tier-friendly tactics baked into the design

- Use the connection pooler URL (`...pooler.supabase.com:6543`) for all server-side calls.
- Profile photos and contract PDFs go to Cloudflare R2 (10 GB free egress, $0.015/GB stored after 10 GB) instead of Supabase Storage. Keep only 200×200 thumbnails in Supabase Storage.
- Run a GitHub Actions cron every 6 hours hitting an Edge Function called `keep-alive` so the project never pauses.
- Run a nightly `pg_dump` via GitHub Actions to R2 for backup.

---

## 4. Auth, Identity, and Roles

### 4.1 Sign-up flow

1. User picks role on the landing page: **I'm an athlete** or **I'm a business**.
2. Supabase Auth account is created (email/password, Google, Apple). Email confirmation required.
3. After `auth.signUp`, the client immediately calls Edge Function `complete-signup({ role })` which:
   - Inserts the `users` row.
   - Sets app-metadata `{ role, active_role }` on the auth user (this lands in the JWT and is read by RLS as `auth.jwt()->>'role'`).
   - Creates an empty `athletes` or `brands` row to be filled out in the wizard.
4. Profile setup wizard saves the role-specific record.
5. Athletes complete Stripe Connect Express onboarding before they can be paid.
6. Brands add a payment method (Stripe SetupIntent) before they can fund a deal.

### 4.2 Identity & verification levels

| Level | What unlocks | Source of truth |
|---|---|---|
| `email_verified` | View profiles, send 1 intro message per athlete | Supabase Auth |
| `phone_verified` | Unlimited messaging | Supabase Auth phone OTP |
| `id_verified` (athlete) | Receive payments | Stripe Connect Express webhook flips `users.id_verified` |
| `school_verified` (athlete) | "Verified Athlete" badge | .edu email match OR student-ID upload reviewed by admin |
| `business_verified` (brand) | Fund deals, post offers | Stripe customer + EIN check |

### 4.3 Custom JWT claims

Supabase puts `app_metadata` from `auth.users` into the JWT under `app_metadata`. RLS reads it via:

```sql
auth.jwt() -> 'app_metadata' ->> 'role'
auth.jwt() -> 'app_metadata' ->> 'active_role'
```

Only Edge Functions (using the service role key) can write to `app_metadata`. Client cannot escalate.

---

## 5. Full Postgres Schema (DDL)

All DDL below is intended to live in Supabase migrations under `supabase/migrations/`. Order matters because of foreign keys.

### 5.1 Extensions, enums, helpers

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- Roles
create type user_role as enum ('athlete', 'brand', 'admin');
create type user_status as enum ('active', 'suspended', 'banned', 'pending_review');

-- Athlete
create type athlete_year as enum ('Freshman','Sophomore','Junior','Senior','Grad','5th Year');
create type division_type as enum ('FBS','FCS','D2','D3','NAIA','JUCO');
create type gender_type as enum ('male','female','nonbinary','prefer_not_to_say');

-- Deals
create type deal_status as enum (
  'draft','pending_athlete_review','counter_offered','accepted','rejected','withdrawn',
  'awaiting_funding','funded','in_progress','deliverables_submitted',
  'completed','disputed','cancelled','refunded'
);
create type deal_category as enum (
  'post','story','reel','appearance','autograph','ambassador','merchandise','other'
);
create type deliverable_status as enum ('pending','submitted','approved','rejected');
create type deliverable_platform as enum ('instagram','tiktok','twitter','youtube','in_person','other');

-- Payments
create type payment_status as enum (
  'requires_payment_method','requires_confirmation','processing',
  'succeeded','canceled','failed','refunded','partially_refunded'
);
create type escrow_state as enum ('held','released','refunded','disputed');
create type payout_status as enum ('pending','in_transit','paid','failed','canceled');

-- Misc
create type message_type as enum ('text','offer','counter_offer','system','attachment');
create type contract_status as enum ('draft','sent','athlete_signed','brand_signed','fully_signed','voided');
create type tax_doc_type as enum ('w9','w8ben','1099_k','1099_nec');
create type tax_doc_status as enum ('pending','filed','delivered');
create type report_reason as enum ('spam','harassment','fraud','underage','compliance','other');
create type report_status as enum ('open','investigating','resolved','dismissed');

-- Helper: updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
```

### 5.2 `users` (root identity record)

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  email_verified boolean not null default false,
  phone text,
  phone_verified boolean not null default false,
  role user_role not null,
  active_role user_role not null,
  status user_status not null default 'active',
  display_name text not null,
  photo_url text,
  id_verified boolean not null default false,
  school_verified boolean not null default false,
  business_verified boolean not null default false,
  onboarding_complete boolean not null default false,
  notif_email jsonb not null default '{"messages":true,"offers":true,"payments":true,"marketing":false}',
  notif_push  jsonb not null default '{"messages":true,"offers":true,"payments":true}',
  notif_sms   jsonb not null default '{"messages":false,"offers":true,"payments":true}',
  blocked_user_ids uuid[] not null default '{}',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_active_role check (active_role in ('athlete','brand'))
);
create trigger tg_users_updated before update on public.users
  for each row execute function public.tg_set_updated_at();

create index idx_users_role on public.users(role);
create index idx_users_status on public.users(status);
```

### 5.3 `schools` (reference data)

```sql
create table public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_name text not null,
  conference text,
  division division_type not null,
  state text not null,
  email_domains text[] not null default '{}',
  compliance_contact_email citext,
  nil_policy_url text,
  logo_url text,
  created_at timestamptz not null default now()
);
create index idx_schools_name_trgm on public.schools using gin (name gin_trgm_ops);
create index idx_schools_email_domains on public.schools using gin (email_domains);
```

### 5.4 `athletes`

```sql
create table public.athletes (
  id uuid primary key references public.users(id) on delete cascade,
  bio text check (length(bio) <= 500),
  cover_photo_url text,

  sport text not null,
  position text,
  jersey_number text,
  year athlete_year not null,
  university_id uuid references public.schools(id),
  university_name text not null,            -- denormalized for fast filtering
  conference text,
  graduation_year int,

  date_of_birth date,                       -- private; never selected by anonymous queries
  hometown text,
  gender gender_type,
  ethnicity text[],

  socials jsonb not null default '{}'::jsonb,
  total_reach bigint not null default 0,    -- denormalized, computed by trigger

  is_available boolean not null default true,
  accepts_categories text[] not null default '{}',
  preferred_deal_types deal_category[] not null default '{}',
  min_deal_amount_cents int not null default 5000 check (min_deal_amount_cents >= 0),
  rate_card jsonb not null default '{}'::jsonb,

  is_verified boolean not null default false,           -- school + ID verified
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  review_count int not null default 0,
  completed_deals_count int not null default 0,
  response_rate_30d numeric(4,3) not null default 0,
  median_response_hours numeric(6,2),

  school_compliance_email citext,
  agent_represented boolean not null default false,
  agency_name text,

  search_tsv tsvector,                                  -- maintained by trigger
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tg_athletes_updated before update on public.athletes
  for each row execute function public.tg_set_updated_at();

-- search_tsv maintenance
create or replace function public.tg_athletes_tsv() returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce((select display_name from public.users where id = new.id),'')),'A') ||
    setweight(to_tsvector('simple', coalesce(new.sport,'')),'A') ||
    setweight(to_tsvector('simple', coalesce(new.position,'')),'B') ||
    setweight(to_tsvector('simple', coalesce(new.university_name,'')),'A') ||
    setweight(to_tsvector('simple', coalesce(new.bio,'')),'C');
  return new;
end $$;
create trigger tg_athletes_tsv_upd before insert or update on public.athletes
  for each row execute function public.tg_athletes_tsv();

create index idx_athletes_search_tsv on public.athletes using gin (search_tsv);
create index idx_athletes_sport on public.athletes(sport);
create index idx_athletes_university on public.athletes(university_id);
create index idx_athletes_avail on public.athletes(is_available) where is_available = true;
create index idx_athletes_verified on public.athletes(is_verified) where is_verified = true;
create index idx_athletes_categories on public.athletes using gin (accepts_categories);
```

### 5.5 `brands`

```sql
create table public.brands (
  id uuid primary key references public.users(id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  bio text check (length(bio) <= 500),
  cover_photo_url text,
  website text,
  industry text,
  industry_tags text[] not null default '{}',

  hq_address jsonb,                              -- {line1,line2,city,region,postal,country}

  legal_entity_type text check (legal_entity_type in ('llc','c_corp','s_corp','sole_prop','nonprofit')),
  ein_encrypted bytea,                           -- pgcrypto, never returned via PostgREST
  ein_last4 text check (ein_last4 ~ '^[0-9]{4}$'),
  stripe_customer_id text,
  business_verified boolean not null default false,
  needs_booster_review boolean not null default false,

  target_sports text[] not null default '{}',
  target_conferences text[] not null default '{}',
  target_genders text[] not null default '{}',
  target_schools uuid[] not null default '{}',
  campaign_budget_monthly_cents bigint,

  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  review_count int not null default 0,
  completed_deals_count int not null default 0,
  total_spent_cents bigint not null default 0,

  search_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tg_brands_updated before update on public.brands
  for each row execute function public.tg_set_updated_at();

create or replace function public.tg_brands_tsv() returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.display_name,'')),'A') ||
    setweight(to_tsvector('simple', coalesce(new.industry,'')),'B') ||
    setweight(to_tsvector('simple', coalesce(new.bio,'')),'C');
  return new;
end $$;
create trigger tg_brands_tsv_upd before insert or update on public.brands
  for each row execute function public.tg_brands_tsv();

create index idx_brands_search_tsv on public.brands using gin (search_tsv);
create index idx_brands_industry on public.brands(industry);
```

### 5.6 `conversations` and `messages`

```sql
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references public.users(id) on delete cascade,
  brand_id uuid not null references public.users(id) on delete cascade,
  last_message_text text,
  last_message_at timestamptz,
  last_sender_id uuid references public.users(id),
  unread_athlete int not null default 0,
  unread_brand int not null default 0,
  archived_athlete boolean not null default false,
  archived_brand boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_conversations_pair unique (athlete_id, brand_id)
);
create trigger tg_convs_updated before update on public.conversations
  for each row execute function public.tg_set_updated_at();

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  type message_type not null default 'text',
  text text check (length(text) <= 2000),
  attachment_url text,
  attachment_mime text,
  offer_deal_id uuid,                          -- FK declared after deals table
  read_at_other timestamptz,
  edited boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_messages_conv on public.messages(conversation_id, created_at desc);
```

### 5.7 `deals`, `deal_deliverables`, `deal_events`

```sql
create table public.deals (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references public.users(id) on delete restrict,
  brand_id uuid not null references public.users(id) on delete restrict,
  conversation_id uuid references public.conversations(id),

  title text not null check (length(title) between 1 and 200),
  description text not null check (length(description) <= 2000),
  category deal_category not null,

  amount_cents bigint not null check (amount_cents >= 100),
  platform_fee_cents bigint not null check (platform_fee_cents >= 0),
  athlete_payout_cents bigint not null check (athlete_payout_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),

  proposed_start date,
  proposed_end date,
  expires_at timestamptz,

  status deal_status not null default 'draft',
  requires_disclosure boolean not null default true,
  disclosure_completed boolean not null default false,
  compliance_filing_id uuid,

  contract_id uuid,
  signed_by_athlete_at timestamptz,
  signed_by_brand_at timestamptz,

  payment_intent_id text,
  escrow_id uuid,
  funded_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_amount_eq check (amount_cents = platform_fee_cents + athlete_payout_cents)
);
create trigger tg_deals_updated before update on public.deals
  for each row execute function public.tg_set_updated_at();
create index idx_deals_athlete on public.deals(athlete_id, status);
create index idx_deals_brand on public.deals(brand_id, status);
create index idx_deals_status on public.deals(status);

-- now wire messages.offer_deal_id
alter table public.messages
  add constraint fk_messages_deal foreign key (offer_deal_id) references public.deals(id);

create table public.deal_deliverables (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  description text not null,
  platform deliverable_platform,
  due_at timestamptz,
  proof_url text,
  proof_submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  status deliverable_status not null default 'pending',
  position int not null default 0
);
create index idx_deliverables_deal on public.deal_deliverables(deal_id);

create table public.deal_events (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  actor_id uuid not null references public.users(id),
  event_type text not null,           -- 'created','counter','accepted',...
  payload jsonb,
  created_at timestamptz not null default now()
);
create index idx_deal_events_deal on public.deal_events(deal_id, created_at desc);
```

### 5.8 `contracts`

```sql
create table public.contracts (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  athlete_id uuid not null references public.users(id),
  brand_id uuid not null references public.users(id),
  template_version text not null,
  pdf_url text not null,
  signwell_request_id text not null,
  status contract_status not null default 'draft',
  athlete_signed_at timestamptz,
  brand_signed_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now()
);
create index idx_contracts_deal on public.contracts(deal_id);
alter table public.deals add constraint fk_deals_contract
  foreign key (contract_id) references public.contracts(id);
```

### 5.9 `payments`, `escrow`, `payouts`, `webhook_events`

```sql
create table public.webhook_events (
  id text primary key,                   -- Stripe event id or signwell event id
  source text not null,                  -- 'stripe' | 'signwell'
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.payments (
  id text primary key,                   -- == Stripe PaymentIntent id
  deal_id uuid not null references public.deals(id),
  payer_brand_id uuid not null references public.users(id),
  recipient_athlete_id uuid not null references public.users(id),
  amount_cents bigint not null,
  platform_fee_cents bigint not null,
  athlete_payout_cents bigint not null,
  currency text not null default 'USD',
  stripe_charge_id text,
  stripe_transfer_id text,
  status payment_status not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  succeeded_at timestamptz,
  constraint chk_payment_amount check (amount_cents = platform_fee_cents + athlete_payout_cents)
);
create index idx_payments_deal on public.payments(deal_id);

create table public.escrow (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id),
  payment_id text not null references public.payments(id),
  amount_cents bigint not null,
  state escrow_state not null default 'held',
  held_at timestamptz not null default now(),
  released_at timestamptz,
  refunded_at timestamptz,
  release_trigger text                  -- 'manual_brand_approval' | 'auto_72h' | 'admin_override'
);
alter table public.deals add constraint fk_deals_escrow
  foreign key (escrow_id) references public.escrow(id);

create table public.payouts (
  id text primary key,                   -- == Stripe Payout id
  athlete_id uuid not null references public.users(id),
  stripe_account_id text not null,
  amount_cents bigint not null,
  status payout_status not null,
  arrival_date date,
  bank_last4 text,
  created_at timestamptz not null default now()
);
create index idx_payouts_athlete on public.payouts(athlete_id, created_at desc);

-- Stripe Connect account links (private)
create table public.athlete_stripe_accounts (
  athlete_id uuid primary key references public.users(id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  updated_at timestamptz not null default now()
);
```

### 5.10 `tax_documents`

```sql
create table public.tax_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  tax_year int not null,
  type tax_doc_type not null,
  status tax_doc_status not null default 'pending',
  storage_path text not null,
  generated_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (user_id, tax_year, type)
);
```

### 5.11 `reviews`

```sql
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id),
  reviewer_id uuid not null references public.users(id),
  reviewer_role user_role not null check (reviewer_role in ('athlete','brand')),
  subject_id uuid not null references public.users(id),
  rating int not null check (rating between 1 and 5),
  text text check (length(text) <= 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id)             -- one review per side per deal
);
create index idx_reviews_subject on public.reviews(subject_id);
```

### 5.12 `notifications`, `reports`, `compliance_filings`, `audit_logs`, `analyses`

```sql
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.users(id),
  subject_id uuid not null references public.users(id),
  subject_type text not null,            -- 'user'|'message'|'deal'|'review'
  subject_record_id uuid,
  reason report_reason not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text
);

create table public.compliance_filings (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.deals(id),
  athlete_id uuid not null references public.users(id),
  school_id uuid not null references public.schools(id),
  brand_id uuid not null references public.users(id),
  amount_cents bigint not null,
  filed_at timestamptz not null default now(),
  filing_method text not null,
  acknowledged_at timestamptz,
  school_reference_id text
);
alter table public.deals add constraint fk_deals_filing
  foreign key (compliance_filing_id) references public.compliance_filings(id);

create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid,
  actor_role user_role,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_data jsonb,
  after_data jsonb,
  ip text,
  user_agent text,
  at timestamptz not null default now()
);
create index idx_audit_target on public.audit_logs(target_type, target_id);

create table public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  deal_id uuid references public.deals(id),
  contract_text text not null,
  analysis text not null,
  file_name text,
  file_url text,
  created_at timestamptz not null default now()
);
```

### 5.13 Public views (what anonymous and other-role users can read)

```sql
-- Public-safe athlete view: strips DOB, email, address
create view public.athletes_public as
select
  u.id, u.display_name, u.photo_url,
  a.bio, a.cover_photo_url, a.sport, a.position, a.jersey_number, a.year,
  a.university_id, a.university_name, a.conference, a.graduation_year,
  a.gender, a.socials, a.total_reach,
  a.is_available, a.accepts_categories, a.preferred_deal_types,
  a.min_deal_amount_cents, a.rate_card,
  a.is_verified, a.rating, a.review_count, a.completed_deals_count,
  a.response_rate_30d, a.median_response_hours,
  a.created_at
from public.athletes a
join public.users u on u.id = a.id
where u.status = 'active';

-- Public-safe brand view: strips EIN, address, stripe_customer_id
create view public.brands_public as
select
  u.id, u.display_name, u.photo_url,
  b.legal_name, b.display_name as brand_name, b.bio, b.cover_photo_url,
  b.website, b.industry, b.industry_tags,
  b.business_verified, b.rating, b.review_count, b.completed_deals_count,
  b.created_at
from public.brands b
join public.users u on u.id = b.id
where u.status = 'active';
```

Grant select on the views to `authenticated` and `anon`. RLS on the underlying tables still applies, but views are how we expose the safe subset.

---

## 6. Row Level Security (RLS) Policies

Enable RLS on every table; default-deny is automatic. Helpers first:

```sql
-- helpers
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role','') = 'admin'
$$;

create or replace function public.current_role_claim() returns text
language sql stable as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role','')
$$;

-- Convenience: am I a participant in this conversation?
create or replace function public.is_conv_participant(conv_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id and (c.athlete_id = auth.uid() or c.brand_id = auth.uid())
  )
$$;

alter table public.users          enable row level security;
alter table public.athletes       enable row level security;
alter table public.brands         enable row level security;
alter table public.schools        enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.deals          enable row level security;
alter table public.deal_deliverables enable row level security;
alter table public.deal_events    enable row level security;
alter table public.contracts      enable row level security;
alter table public.payments       enable row level security;
alter table public.escrow         enable row level security;
alter table public.payouts        enable row level security;
alter table public.athlete_stripe_accounts enable row level security;
alter table public.tax_documents  enable row level security;
alter table public.reviews        enable row level security;
alter table public.notifications  enable row level security;
alter table public.reports        enable row level security;
alter table public.compliance_filings enable row level security;
alter table public.audit_logs     enable row level security;
alter table public.analyses       enable row level security;
alter table public.webhook_events enable row level security;
```

### 6.1 `users` policies

```sql
create policy users_select_self on public.users
  for select using (auth.uid() = id or public.is_admin());

create policy users_update_self on public.users
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- block self-escalation: server-only fields
    and role = (select role from public.users where id = auth.uid())
    and status = (select status from public.users where id = auth.uid())
    and id_verified = (select id_verified from public.users where id = auth.uid())
    and school_verified = (select school_verified from public.users where id = auth.uid())
    and business_verified = (select business_verified from public.users where id = auth.uid())
  );

-- Inserts only via Edge Function with service role; no client insert/delete policies.
```

### 6.2 `athletes` and `brands`

```sql
-- Athletes: anyone authenticated can SELECT only via the public view.
revoke all on public.athletes from anon, authenticated;
grant select on public.athletes_public to anon, authenticated;

create policy athletes_owner_select on public.athletes
  for select using (auth.uid() = id or public.is_admin());

create policy athletes_owner_update on public.athletes
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_verified = (select is_verified from public.athletes where id = auth.uid())
    and rating = (select rating from public.athletes where id = auth.uid())
    and review_count = (select review_count from public.athletes where id = auth.uid())
    and completed_deals_count = (select completed_deals_count from public.athletes where id = auth.uid())
    and total_reach = (select total_reach from public.athletes where id = auth.uid())
  );

create policy athletes_admin_all on public.athletes
  for all using (public.is_admin()) with check (public.is_admin());

-- Mirror for brands
revoke all on public.brands from anon, authenticated;
grant select on public.brands_public to anon, authenticated;

create policy brands_owner_select on public.brands
  for select using (auth.uid() = id or public.is_admin());

create policy brands_owner_update on public.brands
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and ein_encrypted is not distinct from (select ein_encrypted from public.brands where id = auth.uid())
    and stripe_customer_id is not distinct from (select stripe_customer_id from public.brands where id = auth.uid())
    and business_verified = (select business_verified from public.brands where id = auth.uid())
    and rating = (select rating from public.brands where id = auth.uid())
    and total_spent_cents = (select total_spent_cents from public.brands where id = auth.uid())
  );
```

### 6.3 `schools`

```sql
create policy schools_read_all on public.schools
  for select using (true);
-- writes admin-only (handled via service role; no insert/update/delete policies for clients)
```

### 6.4 `conversations`, `messages`

```sql
create policy conv_select_participant on public.conversations
  for select using (auth.uid() = athlete_id or auth.uid() = brand_id or public.is_admin());

-- Inserts only via Edge Function getOrCreateConversation; no client insert.

create policy conv_update_participant on public.conversations
  for update using (auth.uid() = athlete_id or auth.uid() = brand_id)
  with check (
    -- can only flip your own archived flag and unread counter via SECURITY DEFINER function
    -- so disallow direct updates by giving no with-check satisfaction; we route through fn_mark_read()
    false
  );

create policy msg_select_participant on public.messages
  for select using (public.is_conv_participant(conversation_id) or public.is_admin());

create policy msg_insert_participant on public.messages
  for insert with check (
    public.is_conv_participant(conversation_id)
    and sender_id = auth.uid()
    and not exists (select 1 from public.conversations c where c.id = conversation_id and c.blocked = true)
  );
```

### 6.5 `deals`, `deal_deliverables`, `deal_events`

Direct client writes are tightly restricted; meaningful state changes go through Edge Function `deal-transition` running as service role.

```sql
create policy deals_select_party on public.deals
  for select using (auth.uid() in (athlete_id, brand_id) or public.is_admin());

create policy deals_insert_brand on public.deals
  for insert with check (
    brand_id = auth.uid()
    and public.current_role_claim() = 'brand'
    and status = 'draft'
  );

-- Disallow direct updates; everything goes through Edge Function.
-- Audit any sneaky client update by leaving no UPDATE policy.

create policy deliverables_select_party on public.deal_deliverables
  for select using (
    exists (select 1 from public.deals d where d.id = deal_id
            and (d.athlete_id = auth.uid() or d.brand_id = auth.uid() or public.is_admin()))
  );

create policy deal_events_select_party on public.deal_events
  for select using (
    exists (select 1 from public.deals d where d.id = deal_id
            and (d.athlete_id = auth.uid() or d.brand_id = auth.uid() or public.is_admin()))
  );
```

### 6.6 Money tables — read-own, write-server-only

```sql
create policy payments_select_party on public.payments
  for select using (
    auth.uid() in (payer_brand_id, recipient_athlete_id) or public.is_admin()
  );

create policy escrow_select_party on public.escrow
  for select using (
    exists (select 1 from public.deals d where d.id = deal_id
            and (d.athlete_id = auth.uid() or d.brand_id = auth.uid() or public.is_admin()))
  );

create policy payouts_select_self on public.payouts
  for select using (athlete_id = auth.uid() or public.is_admin());

create policy stripe_acct_select_self on public.athlete_stripe_accounts
  for select using (athlete_id = auth.uid() or public.is_admin());

create policy taxdocs_select_self on public.tax_documents
  for select using (user_id = auth.uid() or public.is_admin());
```

No insert/update/delete policies — service role only.

### 6.7 `reviews`, `notifications`, `reports`, `compliance_filings`, `audit_logs`, `analyses`, `contracts`, `webhook_events`

```sql
-- Reviews public-readable; insert through Edge Function.
create policy reviews_read_all on public.reviews
  for select using (hidden = false or public.is_admin());

create policy contracts_select_party on public.contracts
  for select using (auth.uid() in (athlete_id, brand_id) or public.is_admin());

create policy notif_select_self on public.notifications
  for select using (user_id = auth.uid());
create policy notif_update_self on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reports_insert_self on public.reports
  for insert with check (reporter_id = auth.uid());
create policy reports_select_self on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy filings_admin_only on public.compliance_filings
  for select using (public.is_admin() or athlete_id = auth.uid() or brand_id = auth.uid());

create policy audit_admin_only on public.audit_logs
  for select using (public.is_admin());

create policy analyses_select_self on public.analyses
  for select using (user_id = auth.uid() or public.is_admin());
create policy analyses_insert_self on public.analyses
  for insert with check (user_id = auth.uid());

create policy webhooks_admin_only on public.webhook_events
  for select using (public.is_admin());
```

### 6.8 Storage RLS (for uploaded files)

Buckets:

- `avatars` — public read, owner write.
- `cover-photos` — public read, owner write.
- `deal-proofs` — read by deal participants only.
- `contracts` — read by deal participants + admin.
- `tax-docs` — read by owning user only.

Example policy on `avatars`:

```sql
create policy "avatars: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars: owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 7. State Machines & Invariants

### 7.1 Deal lifecycle (same as Firebase plan)

```
draft
  └─► pending_athlete_review
        ├─► counter_offered ─► pending_athlete_review (loop)
        ├─► rejected (terminal)
        ├─► withdrawn (terminal)
        └─► accepted
              └─► awaiting_funding
                    └─► funded ─► in_progress
                          ├─► deliverables_submitted
                          │     ├─► completed (terminal)
                          │     └─► disputed
                          │           ├─► completed
                          │           └─► refunded (terminal)
                          └─► cancelled ─► refunded (terminal)
```

### 7.2 Server-side enforcement: `fn_transition_deal`

A single SECURITY DEFINER function is the only thing that mutates `deals.status`. Edge Functions and admin RPCs both call it. RLS leaves no UPDATE policy on `deals` for clients, so direct mutation is impossible.

```sql
create or replace function public.fn_transition_deal(
  p_deal_id uuid,
  p_to deal_status,
  p_actor uuid,
  p_payload jsonb default '{}'::jsonb
) returns public.deals
language plpgsql security definer set search_path = public as $$
declare
  d public.deals;
  allowed boolean;
begin
  select * into d from public.deals where id = p_deal_id for update;
  if not found then raise exception 'deal not found'; end if;

  -- Allowed transitions table (subset shown; expand to match §4 of doc)
  allowed := case
    when d.status = 'draft' and p_to = 'pending_athlete_review' and p_actor = d.brand_id then true
    when d.status = 'pending_athlete_review' and p_to = 'counter_offered' and p_actor = d.athlete_id then true
    when d.status = 'pending_athlete_review' and p_to = 'rejected' and p_actor = d.athlete_id then true
    when d.status = 'pending_athlete_review' and p_to = 'accepted' and p_actor = d.athlete_id then true
    when d.status = 'accepted' and p_to = 'awaiting_funding' then true
    when d.status = 'awaiting_funding' and p_to = 'funded' then true
    when d.status = 'funded' and p_to = 'in_progress' then true
    when d.status = 'in_progress' and p_to = 'deliverables_submitted' and p_actor = d.athlete_id then true
    when d.status = 'deliverables_submitted' and p_to = 'completed' then true
    when d.status in ('in_progress','deliverables_submitted') and p_to = 'disputed' then true
    when d.status = 'disputed' and p_to in ('completed','refunded') then true
    when d.status in ('draft','pending_athlete_review','accepted','awaiting_funding') and p_to = 'cancelled'
         and p_actor in (d.athlete_id, d.brand_id) then true
    when d.status = 'funded' and p_to = 'refunded' then true
    else false
  end;

  if not allowed then
    raise exception 'illegal transition % -> % for actor %', d.status, p_to, p_actor;
  end if;

  update public.deals set status = p_to, updated_at = now() where id = p_deal_id
    returning * into d;

  insert into public.deal_events(deal_id, actor_id, event_type, payload)
  values (p_deal_id, p_actor, p_to::text, p_payload);

  insert into public.audit_logs(actor_id, action, target_type, target_id, after_data)
  values (p_actor, 'deal.transition.'||p_to::text, 'deal', p_deal_id::text, to_jsonb(d));

  return d;
end $$;
```

### 7.3 Money invariants enforced in DB

- `deals.amount_cents = platform_fee_cents + athlete_payout_cents` (CHECK).
- `payments.amount_cents = platform_fee_cents + athlete_payout_cents` (CHECK).
- `unique (user_id, tax_year, type)` on `tax_documents` so a 1099 can't be double-issued.
- `unique (deal_id, reviewer_id)` so reviews are one-per-side per deal.
- `unique (athlete_id, brand_id)` on `conversations` so a chat can't be duplicated.
- Webhook idempotency via `webhook_events.id PRIMARY KEY`.

---

## 8. Payment Workflow (Stripe Connect Express + Escrow)

### 8.1 Account model

- **Athletes** = Stripe Connect **Express** connected accounts. Stripe handles their KYC, 1099-K, payouts to bank.
- **Brands** = Stripe Customers attached to your platform account; cards or US bank account on file.
- **Platform** = your Stripe account, holds escrow as available balance.

### 8.2 Athlete onboarding sequence

1. Athlete completes profile wizard → frontend calls Edge Function `stripe-onboard-athlete`.
2. Function calls `stripe.accounts.create({ type: "express", country: "US", capabilities: { transfers: { requested: true } } })`, stores in `athlete_stripe_accounts`.
3. Function returns an account-link URL → athlete completes Stripe-hosted onboarding (DOB, SSN last 4, bank).
4. Stripe webhook `account.updated` flips `users.id_verified = true` once `charges_enabled && payouts_enabled`.

### 8.3 Brand payment method

`stripe-create-setup-intent` Edge Function returns a SetupIntent client_secret. Frontend uses Stripe Elements to add a card or US bank account, attached to a Stripe Customer keyed to `brand_id`. Customer ID is written to `brands.stripe_customer_id` by the function.

### 8.4 Funding a deal (escrow flow)

```
1. Athlete accepts offer → fn_transition_deal(..., 'accepted', athleteId)
2. Edge Function on accepted: creates SignWell e-sign request → contracts row (status=sent)
3. Both parties sign → SignWell webhook → fn_transition_deal(..., 'awaiting_funding')
4. Brand clicks "Fund deal" → frontend calls Edge Function deals-fund({dealId})
5. Function:
     - re-validates deal.brand_id == auth.uid()
     - computes platform_fee = round(amount * 0.10)   (10% take rate)
     - stripe.paymentIntents.create({
         amount, currency:'usd',
         customer: brand.stripe_customer_id,
         payment_method_types: ['card','us_bank_account'],
         metadata: { deal_id, athlete_id, brand_id },
         transfer_group: `deal_${dealId}`
       })
     - returns client_secret
6. Frontend confirms via stripe.confirmPayment.
7. Stripe webhook payment_intent.succeeded:
     - upsert webhook_events (idempotency)
     - insert payments, insert escrow(state='held')
     - fn_transition_deal(..., 'funded')
     - notify athlete
8. Athlete delivers, marks each deliverable submitted (Storage upload + RPC).
9. Brand approves all deliverables OR 72h auto-approve cron → release_escrow:
     - stripe.transfers.create({ amount: athlete_payout_cents, currency:'usd',
         destination: athlete_stripe_account_id, transfer_group, source_transaction: chargeId })
     - update escrow state='released', deals released_at, athlete completed_deals_count++
     - fn_transition_deal(..., 'completed')
10. Stripe pays out to athlete's bank automatically (default 2-day rolling).
```

### 8.5 Fee math (single source of truth)

```ts
// supabase/functions/_shared/fees.ts
export const PLATFORM_FEE_BPS = 1000; // 10.00%
export function computeFees(amountCents: number) {
  if (amountCents < 100) throw new Error("min $1");
  const platformFee = Math.round((amountCents * PLATFORM_FEE_BPS) / 10_000);
  const athletePayout = amountCents - platformFee;
  return { platformFeeCents: platformFee, athletePayoutCents: athletePayout };
}
```

### 8.6 Refunds & disputes

- 14-day dispute window after `deliverables_submitted`. Either party calls `deals-dispute`.
- Admin reviews via admin tool, can call `release-escrow` or `refund-deal`.
- Refund: `stripe.refunds.create({ payment_intent })`. Webhook `charge.refunded` updates state.

| Scenario | Stripe action | Platform fee |
|---|---|---|
| Brand cancels before funded | none | n/a |
| Brand cancels after funded, before athlete starts | full refund | platform fee returned |
| Both agree mid-work | partial refund | platform fee prorated |
| Athlete fails, brand wins | full refund | platform fee returned |
| Brand fails to approve, athlete wins | release | platform keeps fee |

### 8.7 Tax forms

- Stripe Connect issues **1099-K** automatically (configured in Stripe dashboard).
- Platform issues **1099-NEC** via cron Edge Function on Jan 15 each year, summing `payments.athlete_payout_cents` per athlete for the prior calendar year. Threshold: $600.
- W-9 collected during Stripe Express onboarding.

---

## 9. Messaging (Supabase Realtime)

### 9.1 Real-time

Supabase Realtime broadcasts Postgres `INSERT/UPDATE/DELETE` over WebSockets. Subscribe per conversation:

```ts
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}` },
      (payload) => appendMessage(payload.new))
  .subscribe();
```

### 9.2 Conversation creation

Brand views athlete profile → clicks "Message" → frontend calls Edge Function `get-or-create-conversation({ otherUid })`. Function checks roles, blocks, upserts on the unique pair `(athlete_id, brand_id)`, returns id.

### 9.3 Sending messages

Direct INSERT allowed by RLS as long as sender = auth.uid() and not blocked. A trigger `tg_msg_after_insert` updates `conversations.last_message_*` and increments `unread_*` for the recipient. A second trigger queues a notification via `pg_notify` that an Edge Function listens to (or simpler: a deferred trigger calls `http_post` to a fan-out function).

### 9.4 Embedded offers

Messages of `type='offer'` carry `offer_deal_id`. Frontend renders an inline card with Accept/Counter/Reject buttons that call `deals-accept` etc.

### 9.5 Anti-abuse

- Rate-limit via Edge Function middleware backed by `rate_limits` table (`user_id text`, `bucket text`, `window_start timestamptz`, `count int`). Max 30/min/user.
- New brand → new athlete: first message routes to a "Requests" inbox (`conversations.archived_athlete=true` until opened).
- Profanity / PII filter via server-side regex + optional Perspective API in the `send-message` function.

---

## 10. Search (Postgres FTS + pg_trgm)

This is your chosen approach. Implementation:

### 10.1 Full-text search

Already wired via `tg_athletes_tsv` trigger on the `athletes` table. Querying:

```sql
-- Search by free text
select * from public.athletes_public
where exists (
  select 1 from public.athletes a
  where a.id = athletes_public.id
    and a.search_tsv @@ websearch_to_tsquery('simple', $1)
)
order by ts_rank(a.search_tsv, websearch_to_tsquery('simple', $1)) desc
limit 20;
```

### 10.2 Faceted filtering

Add as plain `WHERE` clauses:

```sql
... and a.sport = any($2::text[])
    and a.university_id = any($3::uuid[])
    and a.total_reach >= $4
    and a.min_deal_amount_cents <= $5
    and a.is_available = true
    and (a.gender = any($6::gender_type[]) or $6 is null)
```

### 10.3 Typo tolerance via pg_trgm

```sql
-- "alabarma" → "Alabama"
select id, university_name
from public.athletes_public
where university_name % $1
order by similarity(university_name, $1) desc
limit 10;
```

### 10.4 Wrap as RPC

Create `fn_search_athletes(query, sports, schools, min_reach, max_min_deal, gender)` returning a paginated set; the React client calls `supabase.rpc('fn_search_athletes', {...})`. Migration to Algolia later means swapping that one RPC for a function that proxies Algolia.

---

## 11. E-Signatures (SignWell)

### 11.1 Account setup

- Sign up at signwell.com, take the **API Plan ($30/mo)** for templates + embedded signing. The $8 plan is unlimited signatures via UI but not API.
- Store `SIGNWELL_API_KEY` as Edge Function secret.

### 11.2 Flow

1. Edge Function `signwell-create-request({dealId})`:
   - Generate a contract PDF from a template using `@react-pdf/renderer` running in Deno (or call a separate render Edge Function). Insert deal title, deliverables, amount, fee, school disclosure language.
   - Upload PDF to Supabase Storage `contracts` bucket.
   - POST to SignWell `/api/v1/document_templates/documents` with two recipients (athlete email, brand email), `embedded_signing=true`.
   - Insert `contracts` row, `signwell_request_id`.
2. Frontend embeds SignWell iframe with the per-recipient signing URL.
3. SignWell webhook `/webhooks/signwell` (HMAC-verified) updates `contracts.status` to `athlete_signed` / `brand_signed` / `fully_signed`.
4. On `fully_signed`: `fn_transition_deal(dealId, 'awaiting_funding')`.

### 11.3 Audit trail

SignWell provides a tamper-evident audit log per envelope. Save the audit-log URL and final signed PDF in the `contracts` bucket.

---

## 12. Notifications

### 12.1 Channels

- In-app: `notifications` table; React subscribes via Realtime.
- Email: Resend, $0 free tier (100 emails/day) → $20/mo for 50k.
- SMS: Twilio for high-priority only (payment received, urgent compliance).

### 12.2 Trigger model

Postgres triggers + a single fan-out Edge Function:

```sql
create or replace function public.tg_notify() returns trigger language plpgsql as $$
begin
  -- enqueue by inserting into a job queue table
  insert into public.notification_jobs(user_id, type, payload)
  values (new.user_id, new.type, to_jsonb(new));
  return new;
end $$;
```

A scheduled Edge Function `notification-dispatcher` (cron every 30s) drains `notification_jobs`, sends email/SMS based on `users.notif_*` prefs, marks rows processed.

This avoids hooking external HTTP from Postgres directly (which Supabase doesn't natively support without `pg_net`, but `pg_net` works on Pro tier; on Free tier the queue + cron is the simpler path).

---

## 13. NIL Compliance

### 13.1 Filing pipeline

Edge Function `compliance-file({dealId})` triggers on `deal.status = 'funded'`:

1. Look up athlete.university_id → schools row.
2. Generate a one-page PDF summary (deal, brand, amount, deliverables, dates).
3. Email via Resend to `school.compliance_contact_email` with PDF attached.
4. Insert `compliance_filings` row with `filed_at`, `filing_method='email'`.
5. Set `deals.disclosure_completed = false` (pending school ack).

Admin marks `acknowledged_at` once the school replies.

### 13.2 Restricted categories

A small `restricted_categories` table or environment config on the Edge Function:

```ts
const RESTRICTED = ["alcohol","gambling","tobacco","cannabis","adult","firearms","sports_betting"];
```

`deals-create` rejects if `category` or `brand.industry_tags` intersects this list.

### 13.3 Booster detection

`brands` insert/update trigger flags `needs_booster_review = true` when the brand's email domain matches any `schools.email_domains`. Such brands cannot fund deals until admin clears.

---

## 14. Edge Functions API Surface

All functions live in `supabase/functions/<name>/index.ts`, deployed via `supabase functions deploy`. Each:

- Verifies the JWT (`createClient(url, ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization')! }}})`).
- For privileged operations, additionally constructs a service-role client to bypass RLS for legitimate writes.
- Validates input with Zod.
- Writes an `audit_logs` row for every state-changing call.

### 14.1 Function inventory

```
auth/
  complete-signup            POST {role}
  request-school-verify      POST {method:'edu_email'|'student_id'}

profile/
  athlete-update             POST (validated subset of athlete fields)
  brand-update               POST
  brand-set-ein              POST {ein}                    (encrypts; stores last4)

stripe/
  onboard-athlete            POST → returns account_link_url
  create-setup-intent        POST → returns client_secret  (brand)
  webhook                    POST  (signature verified, no JWT)

deals/
  create                     POST  (brand only)
  counter                    POST  (athlete or brand)
  accept                     POST  (athlete)
  reject                     POST
  withdraw                   POST
  cancel                     POST
  fund                       POST → PaymentIntent client_secret
  submit-deliverable         POST  (athlete)
  approve-deliverable        POST  (brand)
  dispute                    POST

contracts/
  signwell-create            POST  (deal accepted)
  signwell-webhook           POST  (HMAC verified, no JWT)

reviews/
  create                     POST  (after deal completed)

compliance/
  file                       POST  (internal/cron)
  ack                        POST  (admin)

discovery/
  search-athletes            POST  (delegates to fn_search_athletes RPC)
  record-profile-view        POST

notifications/
  dispatcher                 SCHEDULED every 30s
  mark-read                  POST

cron/
  keep-alive                 SCHEDULED every 6h            (free tier anti-pause)
  deals-auto-release         SCHEDULED every 1h
  deals-expire-pending       SCHEDULED every 1h
  tax-year-job               SCHEDULED Jan 15 yearly

admin/
  suspend-user               POST
  ban-user
  release-escrow
  refund-deal
  resolve-dispute
  edit-profile-field
```

### 14.2 Scheduled jobs

Scheduling is via `supabase functions schedule` + cron expressions, or a GitHub Actions workflow that hits the function URL. On Free tier, GitHub Actions is the safer route.

---

## 15. Admin & Moderation Tools

A separate React route at `/admin` gated by `role = 'admin'` in the JWT. Capabilities mirror what was in the Firebase plan, but easier to build because Postgres views and joins do most of the work.

- `admin_users_view` — joins users, athletes, brands, recent activity counts.
- `admin_disputes_view` — deals where status='disputed' with countdown timers.
- `admin_compliance_view` — filings where acknowledged_at is null and filed_at < now() - interval '7 days'.
- `admin_moderation_view` — open reports, joined to subject context.
- `admin_audit_view` — full audit log, filterable by actor, action, target.

Every admin write (suspend, ban, release, refund) goes through an `admin/*` Edge Function that:

1. Re-validates `role = 'admin'` in the JWT.
2. Performs the action via service-role client.
3. Inserts an `audit_logs` row capturing before/after state.

Admin actions are SQL-transactional, so a refund + escrow update + deal-status transition + audit log all commit together or roll back together.

---

## 16. Migration Plan from the Existing Firebase Prototype

You already have the React shell, AI features (NIL valuation, contract review, financial literacy, tax autopilot, brand optimization, chatbot), and a Firebase Auth + Firestore wiring. Here's how to swap out the backend without throwing away the frontend.

### Phase 0 — Setup (week 1)

- Create Supabase project (Free tier).
- Set up `supabase/migrations/` with the DDL from §5.
- Run `supabase db push` to apply.
- Add `@supabase/supabase-js` to package.json. Keep `firebase` installed during the transition.
- Create `src/supabase.ts` mirroring the existing `src/firebase.ts` shape.

### Phase 1 — Strangle Auth (week 1–2)

- Replace `Auth.tsx` to use Supabase Auth (`signInWithPassword`, `signInWithOAuth`).
- Build `complete-signup` Edge Function and the role picker.
- Existing Firebase user data — if any test accounts exist, export and recreate; you have no real users yet.

### Phase 2 — Profiles (week 2–3)

- Replace `ProfileSetup.tsx`, `AthleteProfile.tsx` with Supabase-backed wizards writing to `users` + `athletes` / `brands`.
- Build the public views and `athletes_public` filtering.
- Validate the trigger-maintained `search_tsv` works.

### Phase 3 — Discovery (week 3)

- Implement `fn_search_athletes` RPC.
- Build `/search` page reading from `athletes_public` + RPC.

### Phase 4 — Messaging (week 4)

- Build `conversations` + `messages` UI.
- Wire Realtime subscription per conversation.
- Implement Edge Functions `get-or-create-conversation`, `send-message` (with rate-limit + PII filter).

### Phase 5 — Deals state machine (week 5)

- Build `fn_transition_deal` and all deals/* Edge Functions.
- BrandDeals.tsx and an AthleteDealsInbox component become Supabase-backed.
- Embedded offer messages.

### Phase 6 — E-signature (week 6)

- Integrate SignWell, contract templates, webhook handler.

### Phase 7 — Money (week 7–8) — single biggest lift

- Stripe Connect Express onboarding.
- Brand SetupIntent + payment method UI.
- `deals-fund` flow end-to-end with PaymentIntent.
- Stripe webhook handler with idempotency.
- Escrow release + auto-release cron.
- Disputes + admin tools.

### Phase 8 — Compliance, notifications, reviews (week 9)

- Compliance filing pipeline.
- Notifications dispatcher + email templates (Resend).
- Reviews after `completed`.

### Phase 9 — Admin (week 10)

- Admin views and admin Edge Functions.
- Audit log viewer.

### Phase 10 — AI features re-integration (week 10–11)

- Existing AI components (NIL valuation, contract review, etc.) keep working — they just read/write to Supabase tables now (`analyses`, athlete profile fields). Tax autopilot reads from `payments` instead of mocked data.

### Phase 11 — Tax docs + launch prep (week 12)

- `tax-year-job` cron (idle until January).
- Upgrade Supabase to Pro before public launch.
- Penetration test (test RLS by attempting cross-user reads/writes from a regular client).
- Legal review of contract template.

### Phase 12 — Launch.

---

## 17. Build Roadmap (TL;DR)

1. **Auth + roles + onboarding wizard** for both athletes and brands.
2. **Athlete + brand profile schema and CRUD**, with public views.
3. **Discovery via Postgres FTS** (search-athletes RPC, search page).
4. **Messaging** (Realtime, get-or-create-conversation, blocking).
5. **Deals state machine** (offer card, accept/reject/counter, no money yet).
6. **SignWell integration** + contract template.
7. **Stripe Connect Express** + escrow funding flow end-to-end.
8. **Deliverables + escrow release** (manual + 72h auto).
9. **Reviews + ratings**.
10. **NIL compliance pipeline**.
11. **Notifications** (in-app + email).
12. **Admin + moderation**.
13. **Tax docs** (Jan 15 cron).
14. **Mobile push** (FCM via Supabase + Expo wrapper) — later.

---

## 18. Per-Module Claude Prompts

Each prompt below is designed to be pasted into Claude Code. They assume:

- The repo has the existing React/Vite/TS shell.
- A Supabase project is provisioned and `SUPABASE_URL` + `SUPABASE_ANON_KEY` are in `.env`.
- `supabase/migrations/` directory exists with the schema from §5.
- This document lives at `BACKEND_ARCHITECTURE_SUPABASE.md` in the repo root.

> **Header to prepend to every prompt**: `Read /BACKEND_ARCHITECTURE_SUPABASE.md before doing anything. Use the schema, RLS policies, and Edge Function inventory verbatim. Do not invent table names. Use TypeScript everywhere. Match existing Tailwind/shadcn style. Run lint and Supabase migration tests before reporting done.`

### 18.1 Auth + roles + onboarding

```
Read BACKEND_ARCHITECTURE_SUPABASE.md sections 4 and 5.2.

Replace the Firebase auth wiring with Supabase Auth:

1. Create src/supabase.ts that initializes a Supabase client from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
2. Add a role picker step before email/password fields ("I'm an athlete" / "I'm a business"). Persist chosen role to localStorage.
3. After supabase.auth.signUp, immediately call Edge Function complete-signup with {role}. The function (supabase/functions/complete-signup/index.ts):
   - Verifies the JWT.
   - Inserts a public.users row.
   - Sets app_metadata = {role, active_role: role} on the auth user via admin API.
   - Forces a session refresh on success so the new claim lands in the JWT.
4. Replace Auth.tsx OAuth flow to use supabase.auth.signInWithOAuth({provider:'google'}).
5. Build an OnboardingGate component: if users.onboarding_complete is false, redirect to /onboarding which renders AthleteProfileWizard or BrandProfileWizard.
6. Update routing in App.tsx to send athletes to /athlete-dashboard and brands to /brand-dashboard.
7. Write the SQL migration for users table per §5.2 with all RLS policies from §6.1.
8. Add a Playwright test: sign up as athlete, complete onboarding, assert users row exists with role='athlete' and JWT has app_metadata.role='athlete'.
```

### 18.2 Athlete + brand profile wizards

```
Read sections 5.4 (athletes), 5.5 (brands), 5.13 (public views), and 6.2 (RLS).

1. Build AthleteProfileWizard.tsx with steps: Basics → Sport → Socials → Marketplace → Identity. Use react-hook-form + zod. On submit, upsert athletes row.
2. Build BrandProfileWizard.tsx with steps: Company → Contact → Targeting → Payment Method (placeholder for later). Persist EIN through Edge Function brand-set-ein which encrypts via pgcrypto and stores last4 in clear.
3. Add SQL migrations for athletes and brands per §5.4, §5.5, including the trigger functions for search_tsv maintenance.
4. Apply RLS from §6.2 — clients must NOT be able to set is_verified, rating, review_count, completed_deals_count, total_reach, business_verified, ein_encrypted, stripe_customer_id.
5. Create the athletes_public and brands_public views and grant select to anon, authenticated.
6. Add /athletes/[id] and /brands/[id] public profile pages reading from the views.
7. Test: as an athlete, attempt to UPDATE my own row setting is_verified=true → should be denied.
```

### 18.3 Discovery (Postgres FTS)

```
Read section 10.

Implement athlete discovery without any external search service:

1. Add SQL migration creating fn_search_athletes(query text, sports text[], school_ids uuid[], min_reach bigint, max_min_deal int, gender_filter text[], page int, page_size int) returning a set of athletes_public.
2. Build /search page in React with sidebar filters (sport multi-select, conference multi-select, school typeahead from schools table using pg_trgm similarity, follower-range slider, price-range slider, verified-only toggle). Result grid shows athlete cards.
3. Use TanStack Query and call supabase.rpc('fn_search_athletes', {...}). Debounce text input 250ms.
4. Add a "school typeahead" Edge Function or RPC using pg_trgm similarity on schools.name.
5. For brands, mirror with /brands directory page using brands_public.
6. Add discovery.record_profile_view RPC that increments a daily counter row in profile_views(viewed_id, day, count).
7. Test: search for "Texas football" returns athletes at UT or other Texas schools playing football, ranked by ts_rank.
```

### 18.4 Messaging (Realtime)

```
Read sections 5.6, 6.4, 9.

Implement 1-to-1 chat using Supabase Realtime:

1. Add SQL migration for conversations and messages per §5.6, including the triggers that update last_message_* and unread counters on message insert.
2. Edge Function get-or-create-conversation({other_uid}): validates roles are different (athlete↔brand), checks neither has blocked the other, upserts on (athlete_id, brand_id), returns id.
3. Edge Function send-message({conversation_id, text|attachment_url, type}): rate-limited to 30/min via a rate_limits table, runs PII regex, inserts the message row.
4. React: ChatList.tsx (left), ChatThread.tsx (right). Subscribe via supabase.channel(`messages:${conversationId}`) listening to postgres_changes INSERT.
5. Typing indicator + presence using Realtime Broadcast/Presence channels (no DB write).
6. Block/Report buttons that call admin/* and reports endpoints. Reporting writes a reports row.
7. Render embedded offer messages (type='offer') as a card with Accept/Counter/Reject buttons that call deals-* Edge Functions.
8. RLS test: try to read a conversation where you're not a participant → denied. Try to insert a message with sender_id != auth.uid() → denied.
```

### 18.5 Deals + state machine

```
Read sections 5.7, 6.5, 7.

Implement the deal state machine:

1. SQL migration: deals, deal_deliverables, deal_events tables; fn_transition_deal SECURITY DEFINER function from §7.2 with the FULL allowed-transitions table from §7.1.
2. Edge Functions: deals-create, deals-counter, deals-accept, deals-reject, deals-withdraw, deals-cancel, deals-submit-deliverable, deals-approve-deliverable, deals-dispute. Each:
   - Verifies JWT.
   - Validates business rules (counter requires changing amount, accept requires status pending_athlete_review, etc.).
   - Calls fn_transition_deal in a transaction together with side-effects (e.g., create system message).
3. Frontend: in BrandDeals.tsx and AthleteDealsInbox.tsx, render deal card with status badge and action buttons. Buttons for transitions not allowed for the current role/status are disabled or hidden.
4. Add a scheduled Edge Function deals-expire-pending: every hour, transition pending_athlete_review deals older than 14 days to rejected.
5. Tests covering EVERY transition in §7.1, both happy path and denials.
```

### 18.6 E-signatures (SignWell)

```
Read section 11.

Integrate SignWell:

1. Build a contract template using @react-pdf/renderer on a render Edge Function that fills in deal fields, fee disclosure, school disclosure clause.
2. Edge Function signwell-create({deal_id}): generates PDF, uploads to Storage 'contracts' bucket, calls SignWell API to create an embedded signature request with two signers (athlete email, brand email), inserts contracts row with signwell_request_id.
3. Edge Function signwell-webhook: HMAC-verifies signature against SIGNWELL_WEBHOOK_SECRET, updates contracts.status. On 'fully_signed', calls fn_transition_deal(dealId, 'awaiting_funding').
4. Frontend: in deal detail page, when status is accepted, show "Sign now" button that opens SignWell embedded iframe for the current user.
5. After signing, store the final signed PDF in Storage. Make sure the bucket has the RLS policy from §6.8 limiting access to deal participants + admin.
```

### 18.7 Payments — Stripe Connect Express + escrow

```
Read section 8 carefully. This module is the highest-stakes one in the build.

1. Athlete onboarding:
   - Edge Function stripe-onboard-athlete: creates an Express connected account, inserts athlete_stripe_accounts row, creates an account link, returns URL.
   - Edge Function stripe-webhook: verifies signature using STRIPE_WEBHOOK_SECRET, dedupes via webhook_events.id PRIMARY KEY. Handlers:
     * account.updated → update athlete_stripe_accounts.charges_enabled / payouts_enabled, set users.id_verified when both true.
     * payment_intent.succeeded → insert payments + escrow rows, fn_transition_deal('funded').
     * charge.refunded → update payments + escrow + fn_transition_deal('refunded').
     * payout.paid → upsert payouts row, send notification.
2. Brand payment method:
   - Edge Function stripe-create-setup-intent: creates Stripe Customer if missing, stores stripe_customer_id on brands, returns SetupIntent client_secret.
   - Frontend uses Stripe Elements to add card or US bank account.
3. Funding a deal:
   - Edge Function deals-fund({deal_id}): validates auth.uid()==brand_id, status='awaiting_funding', computes platformFee via shared fees.ts, creates PaymentIntent with metadata {deal_id, athlete_id, brand_id} and transfer_group=`deal_${dealId}`. Returns client_secret.
   - Frontend confirms with stripe.confirmPayment.
4. Escrow release:
   - Edge Function deals-approve-deliverable: marks deliverable approved. If all approved, calls release-escrow({deal_id}).
   - release-escrow: stripe.transfers.create with destination=athlete_stripe_account_id, source_transaction=charge_id. Updates escrow.state='released', deals.status='completed', increments athlete.completed_deals_count, brand.total_spent_cents.
   - Scheduled Edge Function deals-auto-release: every 1h, find deals with status='deliverables_submitted' and most-recent submission >72h ago and no dispute → release-escrow.
5. Refunds via admin/refund-deal Edge Function (admin only).
6. /billing page (brand) and /earnings page (athlete) reading payments and payouts via supabase queries (RLS scopes them to the right user).
7. Single source of truth for fee math at supabase/functions/_shared/fees.ts.
8. 12+ tests using Stripe test mode covering: happy path, failed PaymentIntent, partial refund, dispute → admin release, dispute → admin refund, auto-release after 72h.
```

### 18.8 Reviews

```
Read 5.11 + 6.7.

1. SQL migration for reviews table with unique (deal_id, reviewer_id).
2. Edge Function reviews-create({deal_id, rating, text}): validates deal status='completed' and reviewer is participant. Inserts row.
3. Trigger tg_review_after_insert recomputes subject's avg rating + review_count on athletes/brands.
4. Frontend: post-deal modal "How was your experience with X?" with star input.
5. Display average and recent 5 reviews on profile pages.
6. RLS allows all authenticated reads when hidden=false; insert via Edge Function only.
```

### 18.9 NIL compliance

```
Read section 13.

1. Seed schools table from a CSV of NCAA D1 schools (~360 rows). Use a one-time migration with COPY or a script.
2. Edge Function compliance-file({deal_id}): generates PDF summary, emails school.compliance_contact_email via Resend with PDF attached, inserts compliance_filings row.
3. Trigger or webhook handler invokes compliance-file when fn_transition_deal moves a deal to 'funded'.
4. RESTRICTED_CATEGORIES const in the deals-create function rejects ['alcohol','gambling','tobacco','cannabis','adult','firearms','sports_betting']. Return error code DEAL_RESTRICTED_CATEGORY.
5. Trigger on brands: if email domain matches any schools.email_domains, set needs_booster_review=true. deals-fund refuses to proceed when brand has this flag.
6. Admin compliance view + Edge Function compliance-ack to mark filings acknowledged.
```

### 18.10 Notifications

```
Read section 12.

1. SQL migration for notifications, notification_jobs.
2. Triggers on key tables enqueue notification_jobs rows on inserts that should notify (new message, new offer, payment success, payout paid, new review, compliance action required).
3. Edge Function notification-dispatcher (scheduled every 30s on Pro / every 1m via GitHub Actions on Free): drains notification_jobs, respects users.notif_email/push/sms prefs, sends via Resend (email) and Twilio (SMS).
4. Frontend: bell icon in header, supabase realtime subscription on notifications where user_id=me + read=false. Mark-as-read RPC.
5. Settings page lets users toggle channels per category.
```

### 18.11 Admin tooling

```
Read section 15.

1. Restrict /admin route by checking JWT app_metadata.role==='admin'. Server-side too: every admin/* Edge Function re-validates.
2. Pages: Users, Deals, Disputes, Compliance, Reports, Audit Log. Each is a table view backed by a SQL view from §15 read via supabase.
3. Admin Edge Functions: suspend-user, ban-user, release-escrow, refund-deal, resolve-dispute, edit-profile-field, ack-compliance. Each writes audit_logs.
4. UI uses shadcn Table, Dialog, Form. Confirmation dialogs on destructive actions.
```

### 18.12 Tax documents

```
Read sections 5.10 + 8.7.

1. Scheduled Edge Function tax-year-job (cron 0 0 15 1 * via GitHub Actions): for each athlete with sum(payments.athlete_payout_cents where succeeded_at in [Jan 1, Dec 31]) >= 60000 (== $600), generate a 1099-NEC PDF, upload to Storage 'tax-docs' bucket, insert tax_documents row, send email with signed URL valid 30 days.
2. Athlete /tax-center page lists their tax_documents.
3. W-9 and W-8BEN are collected by Stripe during Express onboarding; reference the link there.
4. Have a CPA review the 1099-NEC template before going live.
```

### 18.13 Free-tier ops (do this from day one)

```
Read section 3.

Set up keep-alive and backups so the Free tier doesn't bite us:

1. Edge Function keep-alive: returns 200 OK after a trivial query (select 1).
2. GitHub Actions workflow .github/workflows/keep-alive.yml runs every 6 hours hitting the keep-alive URL.
3. GitHub Actions workflow .github/workflows/db-backup.yml runs nightly: pg_dump via supabase CLI, upload to Cloudflare R2 bucket 'bluechip-backups' using rclone, keep last 14 dumps.
4. Document the upgrade-to-Pro trigger conditions from §3 in /docs/ops.md.
```

---

## 19. Cost Projection

### 19.1 At alpha (Free tier, 0–25 users, 0 GMV)

| Item | Cost |
|---|---|
| Supabase Free | $0 |
| Cloudflare R2 (photos + backups) | $0 (under 10 GB) |
| Resend Free | $0 (under 100 emails/day) |
| Stripe | $0 |
| SignWell API plan | $30/mo |
| GitHub Actions | $0 (public repo) or $0 (private under 2k min/mo) |
| Sentry Developer | $0 |
| **Total** | **~$30/mo** |

### 19.2 At public launch (Pro tier, ~500 users, ~$10k GMV/mo)

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Cloudflare R2 | ~$5 |
| Resend | $20 |
| Stripe Connect | passed through (2.9% + $0.30 per transaction; covered by your platform fee) |
| Stripe Connect Express payout fee | 0.25% + $0.25 per payout |
| SignWell | $30 |
| Twilio SMS (low volume) | ~$15 |
| Sentry Team | $26 |
| Domain + Vercel/Netlify hosting | $20 |
| **Total fixed** | **~$140/mo** |

Platform revenue at 10% of $10k GMV = **$1,000/mo**. Margin healthy.

### 19.3 At scale (~10k MAU, $1M GMV/mo)

| Item | Cost |
|---|---|
| Supabase Pro + usage | $80–200 |
| Cloudflare R2 | ~$30 |
| Resend | ~$80 |
| SignWell volume | ~$80–200 |
| Twilio | ~$100 |
| Sentry | ~$80 |
| Algolia (if/when migrated) | $200–500 |
| Misc infra | ~$50 |
| **Total fixed** | **~$700–1,200/mo** |

Platform revenue at 10% of $1M = **$100k/mo**. Comfortable.

---

## 20. Things to Watch Out For

- **NIL is regulated state-by-state.** Get a sports/entertainment lawyer to review your contract template, dispute policy, and disclosure flow before live launch. Several states (Texas, Florida, California, Tennessee) have explicit NIL statutes that override school rules.
- **Boosters are the third rail.** Pay-for-play disguised as NIL is a major NCAA violation that can cost the athlete eligibility. Your booster-detection trigger and admin review queue is a moat — don't skimp.
- **Minors / high-school athletes** require parental consent (COPPA + state HS rules) and stricter content moderation. Default v1 to college-only — gate on athlete year being a college year and university_id mapping to a college school.
- **Athlete impersonation is your #1 trust risk.** School verification via .edu email + admin review of student ID is non-negotiable before discovery goes live.
- **Money never lives on the platform.** Stripe holds funds. Your "escrow" is just the ledger; the dollars sit in your Stripe balance until released. Talk to Stripe about marketplace agreements and CIP.
- **RLS bypass tests are essential.** Run a test suite that uses an authenticated client (not service role) and tries to: read another user's payments, update is_verified on self, INSERT into deals as athlete, UPDATE deal.status directly, etc. All must fail.
- **Webhook idempotency.** Stripe can deliver the same event twice. The `webhook_events` table with `id PRIMARY KEY` is your dedupe — check it FIRST before processing.
- **Free tier auto-pause.** The keep-alive cron in §18.13 is non-optional. If you forget it and don't log in for 7 days, your alpha users get a dead site.
- **Postgres connection limits.** Always use the connection pooler URL on the server side (Edge Functions auto-handle this; if you ever add a separate Node service, make sure it uses the pooler).
- **Free Resend has no DKIM.** Set up DKIM on a custom domain before you're sending anything besides "magic link" emails — otherwise compliance filings will land in spam.
- **Disputes will happen.** Write a public dispute policy on the site, define the 14-day window, and document the admin SOP before launch.
- **Postgres FTS limits.** It's plenty for <50k athletes. If discovery becomes the product, you will outgrow it; the abstraction (RPC behind `fn_search_athletes`) lets you swap to Algolia in a single migration.

---

*End of Supabase backend plan.*




