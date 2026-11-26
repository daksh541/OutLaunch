-- ==============================================================================
-- Migration: 20261126001300_sales_territory_and_account_planning.sql
-- AI Sales Territory & Account Planning Module
-- Tables:
-- 1. sales_territories
-- 2. sales_territory_assignments
-- 3. sales_account_plans
-- 4. sales_account_plan_actions
-- 5. sales_territory_targets
-- Includes RLS, foreign keys, indexes, and constraints.
-- ==============================================================================

-- 1. SALES TERRITORIES TABLE
create table if not exists public.sales_territories (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  name text not null,
  description text,
  territory_type text not null default 'geographic' check (
    territory_type in ('geographic', 'industry', 'company_size', 'account_based', 'custom')
  ),
  territory_rules jsonb not null default '{}'::jsonb,
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'archived')
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TERRITORY ASSIGNMENTS TABLE (Lead/Account to Territory Mapping)
create table if not exists public.sales_territory_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  territory_id uuid not null references public.sales_territories(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  assignment_reason text,
  assignment_method text not null default 'manual' check (
    assignment_method in ('manual', 'rule_based', 'AI_suggested')
  ),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'reassigned')
  )
);

-- Unique index to prevent duplicate active assignments for the same lead in a workspace
create unique index if not exists idx_active_lead_assignment 
  on public.sales_territory_assignments (workspace_id, lead_id) 
  where (status = 'active');

-- 3. ACCOUNT PLANS TABLE (Strategic account planning)
create table if not exists public.sales_account_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  lead_id uuid not null references public.leads(id) on delete cascade,
  territory_id uuid references public.sales_territories(id) on delete set null,
  account_owner_id uuid references auth.users(id) on delete set null,
  account_name_snapshot text not null,
  account_tier text not null default 'tier_2' check (
    account_tier in ('strategic', 'tier_1', 'tier_2', 'tier_3')
  ),
  account_status text not null default 'active' check (
    account_status in ('prospect', 'active', 'expanding', 'at_risk', 'churned')
  ),
  annual_revenue_target numeric(14,2) not null default 0.0,
  currency text not null default 'USD',
  planning_period_start timestamp with time zone,
  planning_period_end timestamp with time zone,
  account_objectives jsonb not null default '[]'::jsonb,
  account_strategy text,
  last_reviewed_at timestamp with time zone,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint sales_account_plans_lead_unique unique (workspace_id, lead_id)
);

-- 4. ACCOUNT PLAN ACTIONS TABLE (Action items, milestones, tasks)
create table if not exists public.sales_account_plan_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  account_plan_id uuid not null references public.sales_account_plans(id) on delete cascade,
  title text not null,
  description text,
  action_type text not null default 'outreach' check (
    action_type in ('research', 'outreach', 'meeting', 'follow_up', 'proposal', 'renewal', 'other')
  ),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date timestamp with time zone,
  priority text not null default 'medium' check (
    priority in ('low', 'medium', 'high', 'urgent')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  source text not null default 'manual' check (
    source in ('manual', 'AI_suggested')
  ),
  completed_at timestamp with time zone,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TERRITORY TARGETS TABLE
create table if not exists public.sales_territory_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  territory_id uuid not null references public.sales_territories(id) on delete cascade,
  period_type text not null default 'quarterly' check (
    period_type in ('monthly', 'quarterly', 'annual')
  ),
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  revenue_target numeric(14,2) not null default 0.0,
  pipeline_target numeric(14,2) not null default 0.0,
  new_accounts_target integer not null default 0,
  currency text not null default 'USD',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint sales_territory_targets_unique unique (territory_id, period_type, period_start, period_end)
);

-- 6. EXTEND PUBLIC.LEADS WITH TERRITORY COLUMNS IF NOT PRESENT
alter table public.leads
  add column if not exists territory_id uuid references public.sales_territories(id) on delete set null,
  add column if not exists account_tier text default 'tier_2';

-- INDEXES
create index if not exists idx_territories_workspace on public.sales_territories(workspace_id, status);
create index if not exists idx_territories_owner on public.sales_territories(owner_user_id);
create index if not exists idx_assignments_territory on public.sales_territory_assignments(territory_id, status);
create index if not exists idx_assignments_lead on public.sales_territory_assignments(lead_id);
create index if not exists idx_assignments_assigned_to on public.sales_territory_assignments(assigned_to);
create index if not exists idx_account_plans_workspace on public.sales_account_plans(workspace_id, account_tier);
create index if not exists idx_account_plans_territory on public.sales_account_plans(territory_id);
create index if not exists idx_account_plans_lead on public.sales_account_plans(lead_id);
create index if not exists idx_account_plan_actions_plan on public.sales_account_plan_actions(account_plan_id, status);
create index if not exists idx_territory_targets_territory on public.sales_territory_targets(territory_id, period_start);
create index if not exists idx_leads_territory on public.leads(territory_id);

-- ROW LEVEL SECURITY (RLS)
alter table public.sales_territories enable row level security;
alter table public.sales_territory_assignments enable row level security;
alter table public.sales_account_plans enable row level security;
alter table public.sales_account_plan_actions enable row level security;
alter table public.sales_territory_targets enable row level security;

-- Policies for Territories
drop policy if exists "Users can view workspace territories" on public.sales_territories;
create policy "Users can view workspace territories"
  on public.sales_territories for select
  using (true);

drop policy if exists "Users can manage workspace territories" on public.sales_territories;
create policy "Users can manage workspace territories"
  on public.sales_territories for all
  using (true)
  with check (true);

-- Policies for Assignments
drop policy if exists "Users can view territory assignments" on public.sales_territory_assignments;
create policy "Users can view territory assignments"
  on public.sales_territory_assignments for select
  using (true);

drop policy if exists "Users can manage territory assignments" on public.sales_territory_assignments;
create policy "Users can manage territory assignments"
  on public.sales_territory_assignments for all
  using (true)
  with check (true);

-- Policies for Account Plans
drop policy if exists "Users can view account plans" on public.sales_account_plans;
create policy "Users can view account plans"
  on public.sales_account_plans for select
  using (true);

drop policy if exists "Users can manage account plans" on public.sales_account_plans;
create policy "Users can manage account plans"
  on public.sales_account_plans for all
  using (true)
  with check (true);

-- Policies for Account Plan Actions
drop policy if exists "Users can view plan actions" on public.sales_account_plan_actions;
create policy "Users can view plan actions"
  on public.sales_account_plan_actions for select
  using (true);

drop policy if exists "Users can manage plan actions" on public.sales_account_plan_actions;
create policy "Users can manage plan actions"
  on public.sales_account_plan_actions for all
  using (true)
  with check (true);

-- Policies for Targets
drop policy if exists "Users can view territory targets" on public.sales_territory_targets;
create policy "Users can view territory targets"
  on public.sales_territory_targets for select
  using (true);

drop policy if exists "Users can manage territory targets" on public.sales_territory_targets;
create policy "Users can manage territory targets"
  on public.sales_territory_targets for all
  using (true)
  with check (true);
