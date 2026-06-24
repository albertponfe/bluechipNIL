-- BlueChip NIL — Discovery marketplace support
-- Adds the columns the new Discovery/Dashboard frontend needs on top of the
-- base schema (0001_init.sql), opens read access for the marketplace view,
-- adds a place to store generated contract text, and seeds 5 demo athletes
-- so Discovery has real rows to query instead of a hardcoded array.

-- ─────────────────────────────────────────────────────────────────────────
-- New athlete stat columns used by the Discovery match-score cards
-- ─────────────────────────────────────────────────────────────────────────
alter table public.athletes
  add column if not exists followers bigint not null default 0,
  add column if not exists engagement_rate numeric(5,4) not null default 0,
  add column if not exists local_cred numeric(4,2) not null default 0 check (local_cred between 0 and 10);

-- ─────────────────────────────────────────────────────────────────────────
-- Discovery needs to read every athlete's public-safe fields, not just your
-- own row. The existing athletes_select_self policy only covers the owner;
-- this adds a second, broader SELECT policy for any signed-in user.
-- (Postgres RLS policies are OR'd together, so this doesn't loosen anything
-- the owner policy already grants — it just adds marketplace visibility.)
-- ─────────────────────────────────────────────────────────────────────────
create policy athletes_select_discovery on public.athletes
  for select to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Store the AI-generated contract text on the deal itself so the Contracts
-- tab and Athlete Portal's review dialog can both read it back later.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.deals
  add column if not exists contract_text text;

-- ─────────────────────────────────────────────────────────────────────────
-- Seed 5 demo athletes as REAL rows (not just mock data in the frontend).
-- Each needs a corresponding auth.users row because athletes.id references
-- profiles.id which references auth.users.id. Migrations run with full
-- database privileges, so we can insert into auth.users directly here —
-- this is the same pattern Supabase's own seed.sql examples use for local
-- demo users. The password is a literal placeholder string, not a real
-- bcrypt hash (avoids depending on pgcrypto's gen_salt/crypt, which aren't
-- always on the search_path) — these accounts are not meant to ever log in;
-- they exist purely to populate the Discovery feed. Remove or replace
-- before a real launch.
-- ─────────────────────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'marci.demo@bluechipnil.local', 'no-login-placeholder-password', now(),
   '{"provider":"email","providers":["email"]}', '{"role":"athlete","full_name":"Marci Szatmary"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'quaron.demo@bluechipnil.local', 'no-login-placeholder-password', now(),
   '{"provider":"email","providers":["email"]}', '{"role":"athlete","full_name":"Quaron Adams"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'albert.demo@bluechipnil.local', 'no-login-placeholder-password', now(),
   '{"provider":"email","providers":["email"]}', '{"role":"athlete","full_name":"Albert Ponferrada"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'andrew.demo@bluechipnil.local', 'no-login-placeholder-password', now(),
   '{"provider":"email","providers":["email"]}', '{"role":"athlete","full_name":"Andrew Dai"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'sage.demo@bluechipnil.local', 'no-login-placeholder-password', now(),
   '{"provider":"email","providers":["email"]}', '{"role":"athlete","full_name":"Sage Mosley"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- The handle_new_user trigger (from 0001_init.sql) fires on the inserts above
-- and creates the matching public.profiles rows automatically. Now fill in
-- the athlete-specific rows with the Discovery stats.
insert into public.athletes (
  id, name, university, sport, year, instagram, bio, photo_url,
  is_verified, followers, engagement_rate, local_cred
)
values
  ('00000000-0000-0000-0000-000000000001', 'Marci Szatmary', 'UC Berkeley', 'Men''s Water Polo', 'Senior',
   'marci.szatmary', '2x National Champion pulling extremely high engagement with aquatic sports fans, local clubs, and passionate alumni.',
   '/Marci.png', true, 1626, 0.1280, 8.5),
  ('00000000-0000-0000-0000-000000000002', 'Quaron Adams', 'UC Berkeley', 'Football WR', 'Junior',
   null, 'Dynamic playmaker with deep roots in the East Bay area. Highly recognized on campus and by local sports media.',
   '/Quaron.png', true, 6945, 0.0810, 9.0),
  ('00000000-0000-0000-0000-000000000003', 'Albert Ponferrada', 'UC Berkeley', 'Data Science / Water Polo', 'Senior',
   null, '2x National Champion, bridging the gap between analytics and high-performance sports. Incredible niche engagement.',
   '/Albert.png', true, 1193, 0.1320, 7.5),
  ('00000000-0000-0000-0000-000000000004', 'Andrew Dai', 'UC Berkeley', 'Basketball / Football', 'Sophomore',
   null, 'Dual-sport data science enthusiast, widely connected across various campus athletic and academic departments.',
   '/Andrew.png', true, 3400, 0.0750, 8.0),
  ('00000000-0000-0000-0000-000000000005', 'Sage Mosley', 'UC Berkeley', 'Gymnastics', 'Junior',
   null, 'NASA Intern who brings incredible discipline. Huge following from STEM students and Cal gymnastics superfans.',
   '/Sage.png', true, 1387, 0.1450, 8.0)
on conflict (id) do nothing;

-- Mark these seed accounts as onboarding-complete so they don't show up as
-- incomplete profiles anywhere that checks that flag.
update public.profiles
set onboarding_complete = true
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
