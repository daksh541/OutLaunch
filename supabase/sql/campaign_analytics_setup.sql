-- ==============================================================================
-- Setup Script: campaign_analytics_setup.sql
-- Campaign Analytics & Performance Module
-- ==============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'email_events' and column_name = 'is_positive'
  ) then
    alter table public.email_events add column is_positive boolean default false;
  end if;
end $$;

create index if not exists idx_email_events_user_type_created 
  on public.email_events(user_id, event_type, created_at desc);

create index if not exists idx_email_events_user_campaign_type 
  on public.email_events(user_id, campaign_id, event_type);

create index if not exists idx_email_events_lead_event 
  on public.email_events(user_id, lead_id, event_type);

create index if not exists idx_email_events_positive 
  on public.email_events(user_id, campaign_id, is_positive) 
  where is_positive = true;

create index if not exists idx_campaign_leads_campaign_lead 
  on public.campaign_leads(campaign_id, lead_id);
