-- ==============================================================================
-- Setup: lifecycle_automation_setup.sql
-- AI Customer Engagement & Lifecycle Automation Module Standalone Setup
-- ==============================================================================

\i supabase/migrations/20261126001600_customer_engagement_and_lifecycle_automation.sql

-- Initial verification notice
select 'Lifecycle automation tables and constraints ready' as status;
