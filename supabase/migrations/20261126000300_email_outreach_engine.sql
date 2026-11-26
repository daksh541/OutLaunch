-- ==============================================================================
-- Outreach SaaS Email Outreach Engine Schema
-- Tables:
--   1. email_senders: Configured mailboxes, verification status, daily sending caps
--   2. campaign_sequence_steps: Step-by-step cadence (Day offset, Subject, Template body)
--   3. email_jobs: Persistent scheduled queue for sending with retry backoff & idempotency
--   4. email_events: Granular tracking events (queued, sent, delivered, bounced, replied, etc.)
--   5. email_suppressions: Persistent suppression / unsubscribe / do-not-contact list
-- Features: Row Level Security (RLS), foreign key cascades, performance indexes
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. EMAIL_SENDERS TABLE
create table if not exists public.email_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_email text not null,
  reply_to text,
  provider text not null default 'resend', -- 'resend', 'sendgrid', 'postmark', 'smtp', 'mock'
  provider_status text not null default 'unverified', -- 'unverified', 'pending', 'verified', 'error'
  domain_status text not null default 'unverified', -- 'unverified', 'pending', 'verified'
  spf_status text default 'unverified',
  dkim_status text default 'unverified',
  dmarc_status text default 'unverified',
  daily_send_limit integer not null default 35,
  is_default boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint email_senders_user_email_unique unique (user_id, sender_email)
);

-- 2. ALTER CAMPAIGNS TABLE (Add campaign-level scheduler & limits if missing)
alter table public.campaigns
  add column if not exists sender_id uuid references public.email_senders(id) on delete set null,
  add column if not exists schedule_start_at timestamp with time zone,
  add column if not exists daily_limit integer default 35,
  add column if not exists stop_on_reply boolean default true,
  add column if not exists stop_on_bounce boolean default true,
  add column if not exists review_confirmed_at timestamp with time zone;

-- Ensure campaign status supports 'Draft', 'Scheduled', 'Active', 'Paused', 'Completed', 'Cancelled'
-- (Existing status column is text default 'Active')

-- 3. CAMPAIGN_SEQUENCE_STEPS TABLE
create table if not exists public.campaign_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_number integer not null,
  delay_days integer not null default 0, -- 0 for first step, N days delay for subsequent steps
  channel text not null default 'Email', -- 'Email' or 'LinkedIn'
  title text not null default 'Email Step',
  subject text,
  template_body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint campaign_steps_unique_order unique (campaign_id, step_number)
);

-- 4. EMAIL_SUPPRESSIONS TABLE (Do-not-contact / Unsubscribe / Hard Bounce)
create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  reason text not null, -- 'unsubscribed', 'bounced', 'complaint', 'manual'
  origin_campaign_id uuid references public.campaigns(id) on delete set null,
  origin_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint email_suppressions_user_email_unique unique (user_id, email)
);

-- 5. EMAIL_JOBS TABLE (Persistent Queue for Outbound Outreach)
create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  step_id uuid not null references public.campaign_sequence_steps(id) on delete cascade,
  sender_id uuid references public.email_senders(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  rendered_body text not null,
  scheduled_for timestamp with time zone not null,
  status text not null default 'scheduled', -- 'scheduled', 'processing', 'sent', 'failed', 'cancelled', 'skipped'
  idempotency_key text not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  provider_message_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint email_jobs_idempotency_unique unique (idempotency_key)
);

-- 6. EMAIL_EVENTS TABLE (Audit & Lifecycle Telemetry)
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.email_jobs(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  event_type text not null, -- 'queued', 'sent', 'delivered', 'bounced', 'failed', 'replied', 'unsubscribed'
  provider_message_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING & QUEUE SCHEDULER
-- ==============================================================================
create index if not exists idx_email_senders_user on public.email_senders(user_id);
create index if not exists idx_campaign_steps_campaign on public.campaign_sequence_steps(campaign_id, step_number);
create index if not exists idx_email_suppressions_user_email on public.email_suppressions(user_id, email);

-- Critical index for background queue polling: find ready jobs efficiently
create index if not exists idx_email_jobs_queue on public.email_jobs(status, scheduled_for)
  where status in ('scheduled', 'processing');
create index if not exists idx_email_jobs_campaign on public.email_jobs(campaign_id, status);
create index if not exists idx_email_jobs_lead on public.email_jobs(lead_id);
create index if not exists idx_email_events_campaign on public.email_events(campaign_id, event_type);
create index if not exists idx_email_events_lead on public.email_events(lead_id);
create index if not exists idx_email_events_created on public.email_events(created_at desc);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.email_senders enable row level security;
alter table public.campaign_sequence_steps enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.email_jobs enable row level security;
alter table public.email_events enable row level security;

-- EMAIL_SENDERS
drop policy if exists "Users can manage own senders" on public.email_senders;
create policy "Users can manage own senders"
  on public.email_senders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CAMPAIGN_SEQUENCE_STEPS
drop policy if exists "Users can manage own campaign steps" on public.campaign_sequence_steps;
create policy "Users can manage own campaign steps"
  on public.campaign_sequence_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EMAIL_SUPPRESSIONS
drop policy if exists "Users can manage own suppressions" on public.email_suppressions;
create policy "Users can manage own suppressions"
  on public.email_suppressions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EMAIL_JOBS
drop policy if exists "Users can view own email jobs" on public.email_jobs;
create policy "Users can view own email jobs"
  on public.email_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own email jobs" on public.email_jobs;
create policy "Users can insert own email jobs"
  on public.email_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own email jobs" on public.email_jobs;
create policy "Users can update own email jobs"
  on public.email_jobs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own email jobs" on public.email_jobs;
create policy "Users can delete own email jobs"
  on public.email_jobs for delete
  using (auth.uid() = user_id);

-- EMAIL_EVENTS
drop policy if exists "Users can view own email events" on public.email_events;
create policy "Users can view own email events"
  on public.email_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own email events" on public.email_events;
create policy "Users can insert own email events"
  on public.email_events for insert
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
