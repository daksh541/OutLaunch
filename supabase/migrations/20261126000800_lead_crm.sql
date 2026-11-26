-- ==============================================================================
-- Migration: 20261126000800_lead_crm.sql
-- Lead CRM & Sales Pipeline Management Module
-- Extends public.leads with sales pipeline fields, and adds:
-- - lead_pipeline_stages
-- - lead_stage_history
-- - crm_tasks
-- - crm_notes
-- - crm_deals
-- Row Level Security (RLS) & Indexes included.
-- ==============================================================================

-- 1. EXTEND PUBLIC.LEADS TABLE (Sales Pipeline Fields)
alter table public.leads
  add column if not exists stage text default 'New',
  add column if not exists deal_value numeric default 0.0,
  add column if not exists currency text default 'USD',
  add column if not exists expected_close_date timestamp with time zone,
  add column if not exists probability integer default 0,
  add column if not exists last_activity_at timestamp with time zone default timezone('utc'::text, now()),
  add column if not exists next_followup_at timestamp with time zone,
  add column if not exists loss_reason text;

-- 2. PIPELINE STAGES TABLE (Customizable pipeline stages)
create table if not exists public.lead_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  stage_order integer not null,
  color text default '#0d9467',
  is_won boolean default false,
  is_lost boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint lead_pipeline_stages_user_name_unique unique (user_id, name)
);

-- 3. LEAD STAGE HISTORY TABLE (Audit of all pipeline movements)
create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  previous_stage text,
  new_stage text not null,
  changed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CRM TASKS TABLE (Follow-ups, meetings, proposals)
create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  description text,
  task_type text default 'follow_up', -- 'follow_up', 'meeting', 'proposal', 'review_reply', 'contact', 'custom'
  priority text default 'medium', -- 'low', 'medium', 'high', 'urgent'
  status text not null default 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date timestamp with time zone not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CRM NOTES TABLE (Private sales notes per lead)
create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  task_id uuid references public.crm_tasks(id) on delete set null,
  content text not null,
  author_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CRM DEALS TABLE (Qualified deals & value management)
create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  name text not null,
  value numeric not null default 0.0,
  currency text not null default 'USD',
  stage text not null default 'Qualified',
  status text not null default 'open', -- 'open', 'won', 'lost'
  probability integer not null default 50,
  expected_close_date timestamp with time zone,
  loss_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INDEXES
create index if not exists idx_leads_user_stage on public.leads(user_id, stage);
create index if not exists idx_leads_last_activity on public.leads(user_id, last_activity_at desc);
create index if not exists idx_stage_history_lead on public.lead_stage_history(lead_id, created_at desc);
create index if not exists idx_crm_tasks_user_due on public.crm_tasks(user_id, status, due_date);
create index if not exists idx_crm_tasks_lead on public.crm_tasks(lead_id);
create index if not exists idx_crm_notes_lead on public.crm_notes(lead_id, created_at desc);
create index if not exists idx_crm_deals_user_status on public.crm_deals(user_id, status);
create index if not exists idx_crm_deals_lead on public.crm_deals(lead_id);

-- ROW LEVEL SECURITY POLICIES
alter table public.lead_pipeline_stages enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_deals enable row level security;

-- Stages
drop policy if exists "Users can manage own pipeline stages" on public.lead_pipeline_stages;
create policy "Users can manage own pipeline stages"
  on public.lead_pipeline_stages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Stage History
drop policy if exists "Users can view own stage history" on public.lead_stage_history;
create policy "Users can view own stage history"
  on public.lead_stage_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own stage history" on public.lead_stage_history;
create policy "Users can insert own stage history"
  on public.lead_stage_history for insert
  with check (auth.uid() = user_id);

-- Tasks
drop policy if exists "Users can manage own tasks" on public.crm_tasks;
create policy "Users can manage own tasks"
  on public.crm_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notes
drop policy if exists "Users can manage own notes" on public.crm_notes;
create policy "Users can manage own notes"
  on public.crm_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deals
drop policy if exists "Users can manage own deals" on public.crm_deals;
create policy "Users can manage own deals"
  on public.crm_deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
