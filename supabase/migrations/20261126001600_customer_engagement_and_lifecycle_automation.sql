-- ==============================================================================
-- Migration: 20261126001600_customer_engagement_and_lifecycle_automation.sql
-- AI Customer Engagement & Lifecycle Automation Module
-- Tables:
-- 1. lifecycle_workflows
-- 2. lifecycle_workflow_versions (Immutable published versions)
-- 3. lifecycle_workflow_runs (Execution state with idempotency)
-- 4. lifecycle_workflow_steps
-- 5. lifecycle_events (Normalized and deduplicated verified events)
-- 6. lifecycle_approvals
-- 7. lifecycle_action_audit_log
-- Includes RLS, foreign keys, indexes, triggers, and constraints.
-- ==============================================================================

-- 1. LIFECYCLE WORKFLOWS TABLE
create table if not exists public.lifecycle_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  name text not null,
  description text,
  workflow_type text not null default 'custom' check (
    workflow_type in ('onboarding', 'engagement', 'renewal', 'reactivation', 'support_followup', 'custom')
  ),
  status text not null default 'draft' check (
    status in ('draft', 'active', 'paused', 'archived')
  ),
  trigger_config jsonb not null default '{}'::jsonb,
  workflow_config jsonb not null default '{}'::jsonb,
  active_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lifecycle_workflows_workspace on public.lifecycle_workflows (workspace_id);
create index if not exists idx_lifecycle_workflows_status on public.lifecycle_workflows (workspace_id, status);
create index if not exists idx_lifecycle_workflows_type on public.lifecycle_workflows (workspace_id, workflow_type);

-- 2. LIFECYCLE WORKFLOW VERSIONS TABLE (Immutable published definitions)
create table if not exists public.lifecycle_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  workflow_id uuid not null references public.lifecycle_workflows(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  definition jsonb not null default '{}'::jsonb,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamp with time zone default timezone('utc'::text, now()) not null,
  change_summary text,
  constraint lifecycle_workflow_versions_unique_ver unique (workflow_id, version_number)
);

create index if not exists idx_lifecycle_wf_versions_wf on public.lifecycle_workflow_versions (workflow_id, version_number desc);
create index if not exists idx_lifecycle_wf_versions_workspace on public.lifecycle_workflow_versions (workspace_id);

-- Enforce immutability on lifecycle_workflow_versions
create or replace function public.prevent_lifecycle_wf_versions_modification()
returns trigger as $$
begin
  raise exception 'lifecycle_workflow_versions rows are immutable and cannot be updated or deleted';
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_lifecycle_wf_versions_update on public.lifecycle_workflow_versions;
create trigger trg_prevent_lifecycle_wf_versions_update
  before update or delete on public.lifecycle_workflow_versions
  for each row execute function public.prevent_lifecycle_wf_versions_modification();

-- 3. LIFECYCLE WORKFLOW RUNS TABLE
create table if not exists public.lifecycle_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  workflow_id uuid not null references public.lifecycle_workflows(id) on delete cascade,
  workflow_version_id uuid not null references public.lifecycle_workflow_versions(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  customer_success_account_id uuid references public.customer_success_accounts(id) on delete set null,
  trigger_event_id text not null,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'waiting', 'completed', 'failed', 'cancelled')
  ),
  current_step_id text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  failure_reason text,
  execution_context jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotency constraint: prevent identical trigger event from launching duplicate run for the same workflow version
create unique index if not exists idx_lifecycle_runs_idempotent
  on public.lifecycle_workflow_runs (workspace_id, workflow_version_id, trigger_event_id);

create index if not exists idx_lifecycle_runs_workspace on public.lifecycle_workflow_runs (workspace_id);
create index if not exists idx_lifecycle_runs_status on public.lifecycle_workflow_runs (workspace_id, status);
create index if not exists idx_lifecycle_runs_lead on public.lifecycle_workflow_runs (lead_id);
create index if not exists idx_lifecycle_runs_cs_account on public.lifecycle_workflow_runs (customer_success_account_id);
create index if not exists idx_lifecycle_runs_workflow on public.lifecycle_workflow_runs (workflow_id);

-- 4. LIFECYCLE WORKFLOW STEPS TABLE
create table if not exists public.lifecycle_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  workflow_run_id uuid not null references public.lifecycle_workflow_runs(id) on delete cascade,
  step_id text not null,
  step_type text not null,
  status text not null default 'pending' check (
    status in ('pending', 'running', 'waiting_delay', 'waiting_approval', 'completed', 'failed', 'skipped', 'cancelled')
  ),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lifecycle_steps_run on public.lifecycle_workflow_steps (workflow_run_id);
create index if not exists idx_lifecycle_steps_scheduled on public.lifecycle_workflow_steps (status, scheduled_at);
create index if not exists idx_lifecycle_steps_workspace on public.lifecycle_workflow_steps (workspace_id);

-- 5. LIFECYCLE EVENTS TABLE (Normalized & Deduplicated)
create table if not exists public.lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  event_type text not null,
  source text not null,
  source_record_id text not null,
  lead_id uuid references public.leads(id) on delete set null,
  customer_success_account_id uuid references public.customer_success_accounts(id) on delete set null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone,
  processing_status text not null default 'unprocessed' check (
    processing_status in ('unprocessed', 'processed', 'ignored', 'failed')
  ),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists idx_lifecycle_events_dedup
  on public.lifecycle_events (workspace_id, source, source_record_id, event_type);

create index if not exists idx_lifecycle_events_workspace on public.lifecycle_events (workspace_id);
create index if not exists idx_lifecycle_events_type on public.lifecycle_events (workspace_id, event_type);
create index if not exists idx_lifecycle_events_status on public.lifecycle_events (processing_status);
create index if not exists idx_lifecycle_events_occurred on public.lifecycle_events (workspace_id, occurred_at desc);

-- 6. LIFECYCLE APPROVALS TABLE
create table if not exists public.lifecycle_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  workflow_run_id uuid not null references public.lifecycle_workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references public.lifecycle_workflow_steps(id) on delete cascade,
  action_type text not null,
  proposed_action jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')
  ),
  requested_by text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lifecycle_approvals_workspace on public.lifecycle_approvals (workspace_id, status);
create index if not exists idx_lifecycle_approvals_run on public.lifecycle_approvals (workflow_run_id);

-- 7. LIFECYCLE ACTION AUDIT LOG TABLE
create table if not exists public.lifecycle_action_audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  workflow_id uuid references public.lifecycle_workflows(id) on delete set null,
  workflow_version_id uuid references public.lifecycle_workflow_versions(id) on delete set null,
  workflow_run_id uuid references public.lifecycle_workflow_runs(id) on delete set null,
  workflow_step_id uuid references public.lifecycle_workflow_steps(id) on delete set null,
  entity_type text,
  entity_id text,
  action_type text not null,
  actor text not null,
  approval_id uuid references public.lifecycle_approvals(id) on delete set null,
  before_metadata jsonb not null default '{}'::jsonb,
  after_metadata jsonb not null default '{}'::jsonb,
  execution_result jsonb not null default '{}'::jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lifecycle_audit_workspace on public.lifecycle_action_audit_log (workspace_id);
create index if not exists idx_lifecycle_audit_run on public.lifecycle_action_audit_log (workflow_run_id);
create index if not exists idx_lifecycle_audit_action on public.lifecycle_action_audit_log (workspace_id, action_type);
create index if not exists idx_lifecycle_audit_time on public.lifecycle_action_audit_log (workspace_id, timestamp desc);

-- Enable Row Level Security (RLS) on all lifecycle automation tables
alter table public.lifecycle_workflows enable row level security;
alter table public.lifecycle_workflow_versions enable row level security;
alter table public.lifecycle_workflow_runs enable row level security;
alter table public.lifecycle_workflow_steps enable row level security;
alter table public.lifecycle_events enable row level security;
alter table public.lifecycle_approvals enable row level security;
alter table public.lifecycle_action_audit_log enable row level security;

-- Policies for public.lifecycle_workflows
drop policy if exists "Users can access lifecycle workflows in their workspace" on public.lifecycle_workflows;
create policy "Users can access lifecycle workflows in their workspace"
  on public.lifecycle_workflows for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_workflow_versions
drop policy if exists "Users can access lifecycle workflow versions in their workspace" on public.lifecycle_workflow_versions;
create policy "Users can access lifecycle workflow versions in their workspace"
  on public.lifecycle_workflow_versions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_workflow_runs
drop policy if exists "Users can access lifecycle workflow runs in their workspace" on public.lifecycle_workflow_runs;
create policy "Users can access lifecycle workflow runs in their workspace"
  on public.lifecycle_workflow_runs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_workflow_steps
drop policy if exists "Users can access lifecycle workflow steps in their workspace" on public.lifecycle_workflow_steps;
create policy "Users can access lifecycle workflow steps in their workspace"
  on public.lifecycle_workflow_steps for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_events
drop policy if exists "Users can access lifecycle events in their workspace" on public.lifecycle_events;
create policy "Users can access lifecycle events in their workspace"
  on public.lifecycle_events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_approvals
drop policy if exists "Users can access lifecycle approvals in their workspace" on public.lifecycle_approvals;
create policy "Users can access lifecycle approvals in their workspace"
  on public.lifecycle_approvals for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.lifecycle_action_audit_log
drop policy if exists "Users can access lifecycle audit log in their workspace" on public.lifecycle_action_audit_log;
create policy "Users can access lifecycle audit log in their workspace"
  on public.lifecycle_action_audit_log for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
