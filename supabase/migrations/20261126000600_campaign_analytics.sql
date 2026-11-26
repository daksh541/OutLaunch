-- ==============================================================================
-- Migration: 20261126000600_campaign_analytics.sql
-- Campaign Analytics & Performance Module
-- Indexes and performance optimizations for campaign analytics, email event telemetry,
-- conversion funnels, and sequence-step breakdowns.
-- ==============================================================================

-- 1. Ensure columns exist on email_events for high-performance analytics
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'email_events' and column_name = 'is_positive'
  ) then
    alter table public.email_events add column is_positive boolean default false;
  end if;
end $$;

-- 2. Indexes for analytics queries (Overview KPIs, time-series trends, and funnel aggregation)
create index if not exists idx_email_events_user_type_created 
  on public.email_events(user_id, event_type, created_at desc);

create index if not exists idx_email_events_user_campaign_type 
  on public.email_events(user_id, campaign_id, event_type);

create index if not exists idx_email_events_lead_event 
  on public.email_events(user_id, lead_id, event_type);

create index if not exists idx_email_events_positive 
  on public.email_events(user_id, campaign_id, is_positive) 
  where is_positive = true;

-- Ensure campaign_leads index exists for targeted denominator computation
create index if not exists idx_campaign_leads_campaign_lead 
  on public.campaign_leads(campaign_id, lead_id);

-- 3. Row Level Security policies check
alter table public.email_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'email_events' and policyname = 'Users can view own email events'
  ) then
    create policy "Users can view own email events"
      on public.email_events for select
      using (auth.uid() = user_id);
  end if;
end $$;
