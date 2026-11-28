-- ==============================================================================
-- Setup: support_intelligence_setup.sql
-- AI Customer Support & Ticket Intelligence Module Standalone Setup
-- ==============================================================================

\i supabase/migrations/20261126001500_customer_support_and_ticket_intelligence.sql

-- Seed default SLA policies for default-workspace if not already present
insert into public.support_sla_policies (
  workspace_id,
  policy_name,
  is_default,
  priority,
  first_response_time_minutes,
  resolution_time_minutes,
  business_hours_only,
  business_hours_start,
  business_hours_end,
  timezone
) values
  ('default-workspace', 'Critical Priority SLA', true, 'critical', 60, 240, false, '09:00', '17:00', 'UTC'),
  ('default-workspace', 'Urgent Priority SLA', true, 'urgent', 120, 480, false, '09:00', '17:00', 'UTC'),
  ('default-workspace', 'High Priority SLA', true, 'high', 240, 1440, false, '09:00', '17:00', 'UTC'),
  ('default-workspace', 'Medium Priority SLA', true, 'medium', 480, 2880, false, '09:00', '17:00', 'UTC'),
  ('default-workspace', 'Low Priority SLA', true, 'low', 1440, 5760, false, '09:00', '17:00', 'UTC')
on conflict (workspace_id, priority) do nothing;
