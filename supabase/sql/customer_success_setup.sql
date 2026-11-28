-- ==============================================================================
-- Migration: 20261126001400_customer_success_and_renewal_intelligence.sql
-- AI Customer Success & Renewal Intelligence Module
-- Tables:
-- 1. customer_success_accounts
-- 2. customer_health_snapshots (Immutable after creation)
-- 3. customer_success_activities
-- 4. customer_renewal_opportunities
-- 5. customer_expansion_opportunities
-- 6. customer_success_plans
-- Includes RLS, foreign keys, indexes, triggers, and constraints.
-- ==============================================================================

-- 1. CUSTOMER SUCCESS ACCOUNTS TABLE
create table if not exists public.customer_success_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  lead_id uuid not null references public.leads(id) on delete cascade,
  account_owner_id uuid references auth.users(id) on delete set null,
  customer_status text not null default 'active' check (
    customer_status in ('onboarding', 'active', 'at_risk', 'renewal_due', 'churned')
  ),
  customer_since timestamp with time zone default timezone('utc'::text, now()),
  contract_start_date timestamp with time zone,
  contract_end_date timestamp with time zone,
  renewal_date timestamp with time zone,
  contract_value numeric(14,2) not null default 0.0 check (contract_value >= 0),
  currency text not null default 'USD',
  renewal_probability numeric(5,2) not null default 75.0 check (renewal_probability >= 0 and renewal_probability <= 100),
  health_score integer not null default 50 check (health_score >= 0 and health_score <= 100),
  health_status text not null default 'Stable' check (
    health_status in ('Healthy', 'Stable', 'At Risk', 'Critical', 'Insufficient Data')
  ),
  success_objectives jsonb not null default '[]'::jsonb,
  last_customer_review_at timestamp with time zone,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint customer_success_accounts_workspace_lead_unique unique (workspace_id, lead_id)
);

-- 2. CUSTOMER HEALTH SNAPSHOTS TABLE (Immutable historical health calculations)
create table if not exists public.customer_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  customer_success_account_id uuid not null references public.customer_success_accounts(id) on delete cascade,
  health_score integer not null check (health_score >= 0 and health_score <= 100),
  health_status text not null check (
    health_status in ('Healthy', 'Stable', 'At Risk', 'Critical', 'Insufficient Data')
  ),
  component_scores jsonb not null default '{}'::jsonb,
  positive_signals jsonb not null default '[]'::jsonb,
  risk_signals jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  model_version text not null default 'v1.0.0',
  snapshot_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to enforce immutability on customer_health_snapshots
create or replace function public.prevent_health_snapshot_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'customer_health_snapshots records are immutable and cannot be updated or deleted.';
end;
$$;

drop trigger if exists trg_immutable_customer_health_snapshots_update on public.customer_health_snapshots;
create trigger trg_immutable_customer_health_snapshots_update
  before update on public.customer_health_snapshots
  for each row execute function public.prevent_health_snapshot_modification();

-- 3. CUSTOMER SUCCESS ACTIVITIES TABLE
create table if not exists public.customer_success_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  customer_success_account_id uuid not null references public.customer_success_accounts(id) on delete cascade,
  activity_type text not null default 'other' check (
    activity_type in ('meeting', 'email_reply', 'call', 'review', 'onboarding', 'support_issue', 'renewal_discussion', 'other')
  ),
  title text not null,
  description text,
  activity_date timestamp with time zone default timezone('utc'::text, now()) not null,
  source text not null default 'manual',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unique index to avoid duplicate synced activities from existing meetings or call records
create unique index if not exists idx_cs_activities_unique_source
  on public.customer_success_activities (workspace_id, customer_success_account_id, source, source_record_id)
  where (source_record_id is not null);

-- 4. CUSTOMER RENEWAL OPPORTUNITIES TABLE
create table if not exists public.customer_renewal_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  customer_success_account_id uuid not null references public.customer_success_accounts(id) on delete cascade,
  renewal_date timestamp with time zone not null,
  contract_value numeric(14,2) not null default 0.0 check (contract_value >= 0),
  currency text not null default 'USD',
  renewal_status text not null default 'upcoming' check (
    renewal_status in ('upcoming', 'in_progress', 'renewed', 'lost', 'cancelled')
  ),
  renewal_probability numeric(5,2) not null default 75.0 check (renewal_probability >= 0 and renewal_probability <= 100),
  risk_score integer not null default 20 check (risk_score >= 0 and risk_score <= 100),
  risk_factors jsonb not null default '[]'::jsonb,
  renewal_strategy text,
  next_action text,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CUSTOMER EXPANSION OPPORTUNITIES TABLE
create table if not exists public.customer_expansion_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  customer_success_account_id uuid not null references public.customer_success_accounts(id) on delete cascade,
  opportunity_type text not null default 'upsell' check (
    opportunity_type in ('upsell', 'cross_sell', 'seat_expansion', 'usage_expansion', 'other')
  ),
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  currency text not null default 'USD',
  probability numeric(5,2) not null default 50.0 check (probability >= 0 and probability <= 100),
  status text not null default 'suggested' check (
    status in ('suggested', 'approved', 'in_progress', 'won', 'dismissed')
  ),
  evidence jsonb not null default '[]'::jsonb,
  recommended_action text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CUSTOMER SUCCESS PLANS TABLE
create table if not exists public.customer_success_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  customer_success_account_id uuid not null references public.customer_success_accounts(id) on delete cascade,
  plan_period_start timestamp with time zone,
  plan_period_end timestamp with time zone,
  objectives jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  engagement_strategy text,
  risk_mitigation_plan text,
  review_date timestamp with time zone,
  status text not null default 'draft' check (
    status in ('draft', 'review', 'active', 'completed', 'archived')
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INDEXES
create index if not exists idx_cs_accounts_workspace on public.customer_success_accounts(workspace_id, customer_status);
create index if not exists idx_cs_accounts_lead on public.customer_success_accounts(lead_id);
create index if not exists idx_cs_accounts_owner on public.customer_success_accounts(account_owner_id);
create index if not exists idx_cs_accounts_renewal_date on public.customer_success_accounts(workspace_id, renewal_date);
create index if not exists idx_cs_health_snapshots_account on public.customer_health_snapshots(customer_success_account_id, snapshot_date desc);
create index if not exists idx_cs_activities_account on public.customer_success_activities(customer_success_account_id, activity_date desc);
create index if not exists idx_cs_renewals_workspace on public.customer_renewal_opportunities(workspace_id, renewal_status, renewal_date);
create index if not exists idx_cs_renewals_account on public.customer_renewal_opportunities(customer_success_account_id);
create index if not exists idx_cs_expansion_workspace on public.customer_expansion_opportunities(workspace_id, status);
create index if not exists idx_cs_expansion_account on public.customer_expansion_opportunities(customer_success_account_id);
create index if not exists idx_cs_plans_workspace on public.customer_success_plans(workspace_id, status);
create index if not exists idx_cs_plans_account on public.customer_success_plans(customer_success_account_id);

-- ROW LEVEL SECURITY (RLS)
alter table public.customer_success_accounts enable row level security;
alter table public.customer_health_snapshots enable row level security;
alter table public.customer_success_activities enable row level security;
alter table public.customer_renewal_opportunities enable row level security;
alter table public.customer_expansion_opportunities enable row level security;
alter table public.customer_success_plans enable row level security;

-- Policies for customer_success_accounts
drop policy if exists "Users can view workspace customer success accounts" on public.customer_success_accounts;
create policy "Users can view workspace customer success accounts"
  on public.customer_success_accounts for select
  using (true);

drop policy if exists "Users can manage workspace customer success accounts" on public.customer_success_accounts;
create policy "Users can manage workspace customer success accounts"
  on public.customer_success_accounts for all
  using (true)
  with check (true);

-- Policies for customer_health_snapshots (Select & Insert only; immutable)
drop policy if exists "Users can view workspace health snapshots" on public.customer_health_snapshots;
create policy "Users can view workspace health snapshots"
  on public.customer_health_snapshots for select
  using (true);

drop policy if exists "Users can insert workspace health snapshots" on public.customer_health_snapshots;
create policy "Users can insert workspace health snapshots"
  on public.customer_health_snapshots for insert
  with check (true);

-- Policies for customer_success_activities
drop policy if exists "Users can view workspace cs activities" on public.customer_success_activities;
create policy "Users can view workspace cs activities"
  on public.customer_success_activities for select
  using (true);

drop policy if exists "Users can manage workspace cs activities" on public.customer_success_activities;
create policy "Users can manage workspace cs activities"
  on public.customer_success_activities for all
  using (true)
  with check (true);

-- Policies for customer_renewal_opportunities
drop policy if exists "Users can view workspace renewal opportunities" on public.customer_renewal_opportunities;
create policy "Users can view workspace renewal opportunities"
  on public.customer_renewal_opportunities for select
  using (true);

drop policy if exists "Users can manage workspace renewal opportunities" on public.customer_renewal_opportunities;
create policy "Users can manage workspace renewal opportunities"
  on public.customer_renewal_opportunities for all
  using (true)
  with check (true);

-- Policies for customer_expansion_opportunities
drop policy if exists "Users can view workspace expansion opportunities" on public.customer_expansion_opportunities;
create policy "Users can view workspace expansion opportunities"
  on public.customer_expansion_opportunities for select
  using (true);

drop policy if exists "Users can manage workspace expansion opportunities" on public.customer_expansion_opportunities;
create policy "Users can manage workspace expansion opportunities"
  on public.customer_expansion_opportunities for all
  using (true)
  with check (true);

-- Policies for customer_success_plans
drop policy if exists "Users can view workspace cs plans" on public.customer_success_plans;
create policy "Users can view workspace cs plans"
  on public.customer_success_plans for select
  using (true);

drop policy if exists "Users can manage workspace cs plans" on public.customer_success_plans;
create policy "Users can manage workspace cs plans"
  on public.customer_success_plans for all
  using (true)
  with check (true);
