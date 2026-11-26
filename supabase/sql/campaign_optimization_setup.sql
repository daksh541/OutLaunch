-- ==============================================================================
-- Setup Script: campaign_optimization_setup.sql
-- AI Campaign Optimization & Recommendation Engine
-- ==============================================================================

create table if not exists public.campaign_optimization_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  category text not null,
  title text not null,
  explanation text not null,
  suggested_action text not null,
  target_type text,
  target_step_id uuid references public.campaign_sequence_steps(id) on delete set null,
  original_value text,
  proposed_value text,
  supporting_metrics jsonb default '{}'::jsonb,
  confidence text not null default 'medium',
  expected_impact text not null,
  evidence_limitations text not null,
  status text not null default 'new',
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.campaign_optimization_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recommendation_id uuid references public.campaign_optimization_recommendations(id) on delete set null,
  action text not null,
  original_value text,
  new_value text,
  target_entity text,
  target_id text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.campaign_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  experiment_type text not null,
  primary_metric text not null default 'positive_reply_rate',
  status text not null default 'draft',
  traffic_allocation numeric not null default 50.0,
  step_number integer default 1,
  winner_variant text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.campaign_experiment_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null references public.campaign_experiments(id) on delete cascade,
  variant_key text not null,
  name text not null,
  subject text,
  template_body text,
  sample_size integer not null default 0,
  delivered_count integer not null default 0,
  reply_count integer not null default 0,
  positive_reply_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint campaign_experiment_variants_key_unique unique (experiment_id, variant_key)
);

create table if not exists public.campaign_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null references public.campaign_experiments(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_variant text not null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint campaign_experiment_assignments_lead_unique unique (experiment_id, lead_id)
);

create index if not exists idx_opt_recs_user_campaign on public.campaign_optimization_recommendations(user_id, campaign_id, status);
create index if not exists idx_opt_audits_user on public.campaign_optimization_audits(user_id, campaign_id);
create index if not exists idx_opt_exp_campaign on public.campaign_experiments(user_id, campaign_id, status);
create index if not exists idx_opt_exp_assignments on public.campaign_experiment_assignments(experiment_id, lead_id);
