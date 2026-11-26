-- ==============================================================================
-- Outreach SaaS Dashboard Database Migration
-- Tables: profiles, leads, campaigns, campaign_leads
-- Features: Row Level Security (RLS), updated_at triggers, indexes, and auth cascade
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. LEADS TABLE
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  job_title text,
  company text,
  email text not null,
  linkedin_url text,
  website text,
  location text,
  status text default 'Researched',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CAMPAIGNS TABLE
create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CAMPAIGN_LEADS TABLE (Associations)
create table if not exists public.campaign_leads (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint campaign_leads_unique_pair unique (campaign_id, lead_id)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
create index if not exists idx_profiles_user_id on public.profiles(id);

create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_email on public.leads(user_id, email);
create index if not exists idx_leads_status on public.leads(user_id, status);
create index if not exists idx_leads_created_at on public.leads(user_id, created_at desc);

create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_campaigns_status on public.campaigns(user_id, status);
create index if not exists idx_campaigns_created_at on public.campaigns(user_id, created_at desc);

create index if not exists idx_campaign_leads_user_id on public.campaign_leads(user_id);
create index if not exists idx_campaign_leads_campaign on public.campaign_leads(campaign_id);
create index if not exists idx_campaign_leads_lead on public.campaign_leads(lead_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only the owner (auth.uid()) can view, insert, update, or delete their rows.
-- ==============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;

-- PROFILES Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- LEADS Policies
drop policy if exists "Users can view own leads" on public.leads;
create policy "Users can view own leads"
  on public.leads for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own leads" on public.leads;
create policy "Users can insert own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own leads" on public.leads;
create policy "Users can update own leads"
  on public.leads for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own leads" on public.leads;
create policy "Users can delete own leads"
  on public.leads for delete
  using (auth.uid() = user_id);

-- CAMPAIGNS Policies
drop policy if exists "Users can view own campaigns" on public.campaigns;
create policy "Users can view own campaigns"
  on public.campaigns for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own campaigns" on public.campaigns;
create policy "Users can insert own campaigns"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own campaigns" on public.campaigns;
create policy "Users can update own campaigns"
  on public.campaigns for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own campaigns" on public.campaigns;
create policy "Users can delete own campaigns"
  on public.campaigns for delete
  using (auth.uid() = user_id);

-- CAMPAIGN_LEADS Policies
drop policy if exists "Users can view own campaign leads" on public.campaign_leads;
create policy "Users can view own campaign leads"
  on public.campaign_leads for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own campaign leads" on public.campaign_leads;
create policy "Users can insert own campaign leads"
  on public.campaign_leads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own campaign leads" on public.campaign_leads;
create policy "Users can update own campaign leads"
  on public.campaign_leads for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own campaign leads" on public.campaign_leads;
create policy "Users can delete own campaign leads"
  on public.campaign_leads for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'company_name', new.raw_user_meta_data->>'company', 'My Company')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notify PostgREST schema cache to reload
notify pgrst, 'reload schema';
