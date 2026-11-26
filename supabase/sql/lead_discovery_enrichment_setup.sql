-- ==============================================================================
-- Outreach SaaS Lead Discovery & Enrichment Schema Extension
-- Updates:
--   1. Alter leads table to add enrichment, data source, verification status & timestamps
--   2. lead_qualifications table for storing AI ICP scoring, rationale & outreach angles
-- Features: Row Level Security (RLS), provenance tracking, indexes
-- ==============================================================================

-- 1. EXTEND LEADS TABLE
alter table public.leads
  add column if not exists company_domain text,
  add column if not exists company_size text,
  add column if not exists industry text,
  add column if not exists data_source text default 'manual', -- 'apollo', 'manual', 'csv', 'sample'
  add column if not exists verification_status text default 'unverified', -- 'verified', 'unverified', 'not_available'
  add column if not exists enriched_at timestamp with time zone,
  add column if not exists raw_enrichment jsonb default '{}'::jsonb;

-- Unique index on user_id and normalized email for deduplication
create index if not exists idx_leads_user_domain on public.leads(user_id, company_domain);
create index if not exists idx_leads_verification on public.leads(user_id, verification_status);

-- 2. LEAD_QUALIFICATIONS TABLE (AI ICP Qualification & Scoring)
create table if not exists public.lead_qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  fit_score integer not null check (fit_score >= 0 and fit_score <= 100),
  explanation text not null,
  business_rationale text not null,
  potential_angle text not null,
  missing_information text,
  target_icp_criteria jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lead_qualifications_user on public.lead_qualifications(user_id);
create index if not exists idx_lead_qualifications_lead on public.lead_qualifications(lead_id);
create index if not exists idx_lead_qualifications_score on public.lead_qualifications(user_id, fit_score desc);

-- Enable RLS on lead_qualifications
alter table public.lead_qualifications enable row level security;

drop policy if exists "Users can manage own lead qualifications" on public.lead_qualifications;
create policy "Users can manage own lead qualifications"
  on public.lead_qualifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
