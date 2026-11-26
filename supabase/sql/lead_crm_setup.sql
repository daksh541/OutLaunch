-- ==============================================================================
-- Setup Script: lead_crm_setup.sql
-- Lead CRM & Sales Pipeline Management Module
-- ==============================================================================

alter table public.leads
  add column if not exists stage text default 'New',
  add column if not exists deal_value numeric default 0.0,
  add column if not exists currency text default 'USD',
  add column if not exists expected_close_date timestamp with time zone,
  add column if not exists probability integer default 0,
  add column if not exists last_activity_at timestamp with time zone default timezone('utc'::text, now()),
  add column if not exists next_followup_at timestamp with time zone,
  add column if not exists loss_reason text;

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

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  description text,
  task_type text default 'follow_up',
  priority text default 'medium',
  status text not null default 'pending',
  due_date timestamp with time zone not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  name text not null,
  value numeric not null default 0.0,
  currency text not null default 'USD',
  stage text not null default 'Qualified',
  status text not null default 'open',
  probability integer not null default 50,
  expected_close_date timestamp with time zone,
  loss_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_leads_user_stage on public.leads(user_id, stage);
create index if not exists idx_leads_last_activity on public.leads(user_id, last_activity_at desc);
create index if not exists idx_stage_history_lead on public.lead_stage_history(lead_id, created_at desc);
create index if not exists idx_crm_tasks_user_due on public.crm_tasks(user_id, status, due_date);
create index if not exists idx_crm_tasks_lead on public.crm_tasks(lead_id);
create index if not exists idx_crm_notes_lead on public.crm_notes(lead_id, created_at desc);
create index if not exists idx_crm_deals_user_status on public.crm_deals(user_id, status);
create index if not exists idx_crm_deals_lead on public.crm_deals(lead_id);
