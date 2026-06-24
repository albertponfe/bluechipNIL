-- BlueChip NIL — initial schema
-- Mirrors the data the React app actually reads/writes today (profiles,
-- athlete/brand records, manually-entered deals, contract analyses).
-- Extend later with messaging/payments/contracts per the marketplace roadmap.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: one row per auth user, created automatically on signup
-- ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('athlete', 'brand', 'admin')),
  active_role text not null check (active_role in ('athlete', 'brand', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  display_name text not null default '',
  photo_url text,
  id_verified boolean not null default false,
  school_verified boolean not null default false,
  business_verified boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tg_profiles_updated before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile row whenever someone signs up.
-- The client passes the chosen role via supabase.auth.signUp({ options: { data: { role } } }).
-- Google OAuth users have no role yet, so we default to 'athlete'; they can be migrated to
-- 'brand' later from settings if needed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data->>'role', 'athlete');
begin
  insert into public.profiles (id, email, role, active_role, display_name, photo_url)
  values (
    new.id,
    new.email,
    chosen_role,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger tg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- athletes
-- ─────────────────────────────────────────────────────────────────────────
create table public.athletes (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null default '',
  university text not null default '',
  sport text not null default '',
  year text not null default '',
  position text,
  instagram text,
  twitter text,
  tiktok text,
  bio text check (length(bio) <= 1000),
  photo_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tg_athletes_updated before update on public.athletes
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- brands
-- ─────────────────────────────────────────────────────────────────────────
create table public.brands (
  id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text not null default '',
  display_name text not null default '',
  website text,
  industry text,
  bio text check (length(bio) <= 1000),
  city text,
  region text,
  country text default 'US',
  photo_url text,
  business_verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  completed_deals_count int not null default 0,
  total_spent_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tg_brands_updated before update on public.brands
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- deals (simple manual-entry version used by BrandDeals.tsx today)
-- ─────────────────────────────────────────────────────────────────────────
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  athlete_name text,
  brand_id uuid references public.profiles(id) on delete set null,
  brand_name text not null default '',
  title text not null check (length(title) between 1 and 200),
  description text default '',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz not null default now()
);

create index idx_deals_athlete on public.deals(athlete_id);
create index idx_deals_brand on public.deals(brand_id);

-- ─────────────────────────────────────────────────────────────────────────
-- analyses (Contract AI history)
-- ─────────────────────────────────────────────────────────────────────────
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text,
  file_path text,   -- path inside the 'contracts' storage bucket, used to delete the object later
  file_url text,     -- short-lived signed URL for display; re-sign on read if it has expired
  analysis text not null,
  risks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_analyses_user on public.analyses(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.brands   enable row level security;
alter table public.deals    enable row level security;
alter table public.analyses enable row level security;

-- profiles: read/update your own row only. Insert happens via the trigger (security definer).
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
    and id_verified = (select id_verified from public.profiles where id = auth.uid())
    and school_verified = (select school_verified from public.profiles where id = auth.uid())
    and business_verified = (select business_verified from public.profiles where id = auth.uid())
  );

-- athletes: owner can select/insert/update their own row.
create policy athletes_select_self on public.athletes
  for select using (auth.uid() = id);
create policy athletes_insert_self on public.athletes
  for insert with check (auth.uid() = id);
create policy athletes_update_self on public.athletes
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- brands: owner can select/insert/update their own row.
create policy brands_select_self on public.brands
  for select using (auth.uid() = id);
create policy brands_insert_self on public.brands
  for insert with check (auth.uid() = id);
create policy brands_update_self on public.brands
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- deals: either party can see/manage their deals.
create policy deals_select_party on public.deals
  for select using (auth.uid() = athlete_id or auth.uid() = brand_id);
create policy deals_insert_party on public.deals
  for insert with check (auth.uid() = athlete_id or auth.uid() = brand_id);
create policy deals_update_party on public.deals
  for update using (auth.uid() = athlete_id or auth.uid() = brand_id);

-- analyses: owner only.
create policy analyses_select_self on public.analyses
  for select using (auth.uid() = user_id);
create policy analyses_insert_self on public.analyses
  for insert with check (auth.uid() = user_id);
create policy analyses_delete_self on public.analyses
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: a private bucket for uploaded contract files
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

create policy "contracts: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "contracts: owner write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "contracts: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);
