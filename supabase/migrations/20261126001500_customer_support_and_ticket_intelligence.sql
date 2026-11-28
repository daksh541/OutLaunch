-- ==============================================================================
-- Migration: 20261126001500_customer_support_and_ticket_intelligence.sql
-- AI Customer Support & Ticket Intelligence Module
-- Tables:
-- 1. support_tickets
-- 2. support_ticket_messages
-- 3. support_ticket_ai_insights (Immutable historical analysis snapshots)
-- 4. support_sla_policies
-- 5. support_ticket_audit_log
-- Includes RLS, foreign keys, indexes, triggers, and constraints.
-- ==============================================================================

-- 1. SUPPORT TICKETS TABLE
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  lead_id uuid references public.leads(id) on delete set null,
  customer_success_account_id uuid references public.customer_success_accounts(id) on delete set null,
  provider text not null default 'manual' check (
    provider in ('manual', 'csv', 'zendesk', 'intercom', 'email', 'webhook', 'api')
  ),
  provider_ticket_id text,
  ticket_number text not null,
  subject text not null,
  description text not null,
  status text not null default 'open' check (
    status in ('new', 'open', 'pending', 'waiting_on_customer', 'escalated', 'resolved', 'closed', 'reopened')
  ),
  priority text not null default 'medium' check (
    priority in ('low', 'medium', 'high', 'urgent', 'critical')
  ),
  urgency text not null default 'normal' check (
    urgency in ('low', 'normal', 'high', 'critical')
  ),
  category text not null default 'general' check (
    category in ('general', 'billing', 'technical', 'bug', 'feature_request', 'integration', 'security', 'account', 'onboarding', 'performance', 'data_sync')
  ),
  tags jsonb not null default '[]'::jsonb,
  channel text not null default 'web' check (
    channel in ('web', 'email', 'chat', 'phone', 'api', 'csv', 'zendesk', 'intercom')
  ),
  requester_email text not null,
  requester_name text,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  assigned_agent_name text,
  first_response_due_at timestamp with time zone,
  first_responded_at timestamp with time zone,
  resolution_due_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  sla_status text not null default 'within_sla' check (
    sla_status in ('within_sla', 'at_risk', 'breached_response', 'breached_resolution', 'breached_both', 'exempt')
  ),
  is_escalated boolean not null default false,
  escalation_level integer not null default 0 check (escalation_level >= 0),
  escalation_reason text,
  escalated_at timestamp with time zone,
  sentiment text not null default 'neutral' check (
    sentiment in ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')
  ),
  satisfaction_rating numeric(3,2) check (
    satisfaction_rating is null or (satisfaction_rating >= 1.00 and satisfaction_rating <= 5.00)
  ),
  reopen_count integer not null default 0 check (reopen_count >= 0),
  last_activity_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unique constraint for provider tickets per workspace when provider_ticket_id is present
create unique index if not exists idx_support_tickets_workspace_provider_ticket_id
  on public.support_tickets (workspace_id, provider, provider_ticket_id)
  where provider_ticket_id is not null;

-- Unique constraint for ticket numbers per workspace
create unique index if not exists idx_support_tickets_workspace_ticket_number
  on public.support_tickets (workspace_id, ticket_number);

-- Indexes for high-performance querying
create index if not exists idx_support_tickets_workspace on public.support_tickets (workspace_id);
create index if not exists idx_support_tickets_lead on public.support_tickets (lead_id);
create index if not exists idx_support_tickets_cs_account on public.support_tickets (customer_success_account_id);
create index if not exists idx_support_tickets_status on public.support_tickets (workspace_id, status);
create index if not exists idx_support_tickets_priority on public.support_tickets (workspace_id, priority);
create index if not exists idx_support_tickets_sla_status on public.support_tickets (workspace_id, sla_status);
create index if not exists idx_support_tickets_escalated on public.support_tickets (workspace_id, is_escalated);
create index if not exists idx_support_tickets_requester on public.support_tickets (workspace_id, requester_email);
create index if not exists idx_support_tickets_created_at on public.support_tickets (workspace_id, created_at desc);

-- 2. SUPPORT TICKET MESSAGES TABLE
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  workspace_id text not null default 'default-workspace',
  provider_message_id text,
  sender_type text not null default 'customer' check (
    sender_type in ('customer', 'agent', 'system', 'bot')
  ),
  sender_email text not null,
  sender_name text,
  message_body text not null,
  is_private_note boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists idx_support_messages_ticket_provider_msg
  on public.support_ticket_messages (ticket_id, provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_support_messages_ticket on public.support_ticket_messages (ticket_id, created_at asc);
create index if not exists idx_support_messages_workspace on public.support_ticket_messages (workspace_id);

-- 3. SUPPORT TICKET AI INSIGHTS TABLE (Immutable historical / versioned analysis)
create table if not exists public.support_ticket_ai_insights (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  workspace_id text not null default 'default-workspace',
  version integer not null default 1 check (version >= 1),
  summary text not null,
  primary_issue text not null,
  issue_category text not null,
  sentiment text not null check (
    sentiment in ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')
  ),
  sentiment_score numeric(4,3) not null check (sentiment_score >= -1.000 and sentiment_score <= 1.000),
  urgency text not null check (
    urgency in ('low', 'normal', 'high', 'critical')
  ),
  churn_risk_flag boolean not null default false,
  churn_risk_severity text check (
    churn_risk_severity is null or churn_risk_severity in ('low', 'medium', 'high', 'critical')
  ),
  root_cause_analysis text,
  suggested_action text,
  suggested_reply_draft text,
  evidence_quotes jsonb not null default '[]'::jsonb,
  commitments_detected jsonb not null default '[]'::jsonb,
  competitor_mentions jsonb not null default '[]'::jsonb,
  model_name text not null default 'claude-3-5-sonnet',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_support_ai_insights_ticket on public.support_ticket_ai_insights (ticket_id, version desc);
create index if not exists idx_support_ai_insights_workspace on public.support_ticket_ai_insights (workspace_id);

-- Enforce immutability on support_ticket_ai_insights
create or replace function public.prevent_support_ai_insights_modification()
returns trigger as $$
begin
  raise exception 'support_ticket_ai_insights rows are immutable and cannot be updated or deleted';
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_support_ai_insights_update on public.support_ticket_ai_insights;
create trigger trg_prevent_support_ai_insights_update
  before update or delete on public.support_ticket_ai_insights
  for each row execute function public.prevent_support_ai_insights_modification();

-- 4. SUPPORT SLA POLICIES TABLE
create table if not exists public.support_sla_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  policy_name text not null,
  is_default boolean not null default false,
  priority text not null check (
    priority in ('low', 'medium', 'high', 'urgent', 'critical')
  ),
  first_response_time_minutes integer not null check (first_response_time_minutes > 0),
  resolution_time_minutes integer not null check (resolution_time_minutes > 0),
  business_hours_only boolean not null default false,
  business_hours_start text not null default '09:00',
  business_hours_end text not null default '17:00',
  timezone text not null default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint support_sla_policies_workspace_priority_unique unique (workspace_id, priority)
);

create index if not exists idx_support_sla_workspace on public.support_sla_policies (workspace_id);

-- 5. SUPPORT TICKET AUDIT LOG TABLE
create table if not exists public.support_ticket_audit_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  workspace_id text not null default 'default-workspace',
  actor_id text,
  actor_name text,
  action text not null,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_support_audit_ticket on public.support_ticket_audit_log (ticket_id, created_at desc);
create index if not exists idx_support_audit_workspace on public.support_ticket_audit_log (workspace_id);

-- Enable Row Level Security (RLS) on all support tables
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_ai_insights enable row level security;
alter table public.support_sla_policies enable row level security;
alter table public.support_ticket_audit_log enable row level security;

-- Policies for public.support_tickets
drop policy if exists "Users can access support tickets in their workspace" on public.support_tickets;
create policy "Users can access support tickets in their workspace"
  on public.support_tickets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.support_ticket_messages
drop policy if exists "Users can access support messages in their workspace" on public.support_ticket_messages;
create policy "Users can access support messages in their workspace"
  on public.support_ticket_messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.support_ticket_ai_insights
drop policy if exists "Users can access support AI insights in their workspace" on public.support_ticket_ai_insights;
create policy "Users can access support AI insights in their workspace"
  on public.support_ticket_ai_insights for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.support_sla_policies
drop policy if exists "Users can access support SLA policies in their workspace" on public.support_sla_policies;
create policy "Users can access support SLA policies in their workspace"
  on public.support_sla_policies for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policies for public.support_ticket_audit_log
drop policy if exists "Users can access support audit log in their workspace" on public.support_ticket_audit_log;
create policy "Users can access support audit log in their workspace"
  on public.support_ticket_audit_log for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
