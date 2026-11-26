-- ==============================================================================
-- Outreach SaaS AI Lead Research and Personalization Schema
-- Tables: lead_research, lead_drafts
-- Features: Row Level Security (RLS), foreign keys with cascade delete,
--           indexes for fast queries, and timestamps.
-- ==============================================================================

-- 1. LEAD_RESEARCH TABLE
create table if not exists public.lead_research (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  professional_overview text,
  company_overview text,
  likely_priorities jsonb default '[]'::jsonb,
  potential_challenges jsonb default '[]'::jsonb,
  relevance_reasons jsonb default '[]'::jsonb,
  suggested_angle text,
  raw_research jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint lead_research_user_lead_unique unique (user_id, lead_id)
);

-- 2. LEAD_DRAFTS TABLE
create table if not exists public.lead_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  email_subject text,
  email_body text,
  email_opening text,
  email_value_prop text,
  email_cta text,
  linkedin_connection_note text,
  linkedin_follow_up text,
  linkedin_second_follow_up text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint lead_drafts_user_lead_unique unique (user_id, lead_id)
);

-- Indexes for performance
create index if not exists idx_lead_research_user_id on public.lead_research(user_id);
create index if not exists idx_lead_research_lead_id on public.lead_research(lead_id);
create index if not exists idx_lead_research_created_at on public.lead_research(created_at desc);

create index if not exists idx_lead_drafts_user_id on public.lead_drafts(user_id);
create index if not exists idx_lead_drafts_lead_id on public.lead_drafts(lead_id);
create index if not exists idx_lead_drafts_created_at on public.lead_drafts(created_at desc);

-- Enable Row Level Security (RLS)
alter table public.lead_research enable row level security;
alter table public.lead_drafts enable row level security;

-- LEAD_RESEARCH RLS Policies
drop policy if exists "Users can view own lead research" on public.lead_research;
create policy "Users can view own lead research"
  on public.lead_research for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lead research" on public.lead_research;
create policy "Users can insert own lead research"
  on public.lead_research for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lead research" on public.lead_research;
create policy "Users can update own lead research"
  on public.lead_research for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own lead research" on public.lead_research;
create policy "Users can delete own lead research"
  on public.lead_research for delete
  using (auth.uid() = user_id);

-- LEAD_DRAFTS RLS Policies
drop policy if exists "Users can view own lead drafts" on public.lead_drafts;
create policy "Users can view own lead drafts"
  on public.lead_drafts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lead drafts" on public.lead_drafts;
create policy "Users can insert own lead drafts"
  on public.lead_drafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lead drafts" on public.lead_drafts;
create policy "Users can update own lead drafts"
  on public.lead_drafts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own lead drafts" on public.lead_drafts;
create policy "Users can delete own lead drafts"
  on public.lead_drafts for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
