-- ==============================================================================
-- Migration: 20261126000700_campaign_optimization.sql
-- AI Campaign Optimization & Recommendation Engine
-- Schema for campaign health analysis, optimization recommendations,
-- approval audits, and controlled A/B testing experiments.
-- ==============================================================================

-- 1. RECOMMENDATIONS TABLE
create table if not exists public.campaign_optimization_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  category text not null, -- 'subject_line', 'email_copy', 'follow_up', 'audience', 'deliverability'
  title text not null,
  explanation text not null,
  suggested_action text not null,
  target_type text, -- 'subject', 'template_body', 'step', 'campaign', 'audience'
  target_step_id uuid references public.campaign_sequence_steps(id) on delete set null,
  original_value text,
  proposed_value text,
  supporting_metrics jsonb default '{}'::jsonb,
  confidence text not null default 'medium', -- 'high', 'medium', 'low'
  expected_impact text not null,
  evidence_limitations text not null,
  status text not null default 'new', -- 'new', 'reviewed', 'applied', 'dismissed', 'expired'
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. AUDIT TRAIL TABLE
create table if not exists public.campaign_optimization_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recommendation_id uuid references public.campaign_optimization_recommendations(id) on delete set null,
  action text not null, -- 'applied', 'dismissed', 'reviewed', 'variant_generated', 'reverted'
  original_value text,
  new_value text,
  target_entity text,
  target_id text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. A/B EXPERIMENTS TABLE
create table if not exists public.campaign_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  experiment_type text not null, -- 'subject_line', 'email_copy', 'call_to_action'
  primary_metric text not null default 'positive_reply_rate', -- 'positive_reply_rate', 'reply_rate'
  status text not null default 'draft', -- 'draft', 'active', 'paused', 'completed'
  traffic_allocation numeric not null default 50.0,
  step_number integer default 1,
  winner_variant text, -- 'variant_a', 'variant_b', 'inconclusive'
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. EXPERIMENT VARIANTS TABLE
create table if not exists public.campaign_experiment_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null references public.campaign_experiments(id) on delete cascade,
  variant_key text not null, -- 'variant_a', 'variant_b'
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

-- 5. EXPERIMENT ASSIGNMENTS TABLE (Consistent Fair Lead Assignment)
create table if not exists public.campaign_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null references public.campaign_experiments(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_variant text not null, -- 'variant_a', 'variant_b'
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint campaign_experiment_assignments_lead_unique unique (experiment_id, lead_id)
);

-- INDEXES
create index if not exists idx_opt_recs_user_campaign on public.campaign_optimization_recommendations(user_id, campaign_id, status);
create index if not exists idx_opt_audits_user on public.campaign_optimization_audits(user_id, campaign_id);
create index if not exists idx_opt_exp_campaign on public.campaign_experiments(user_id, campaign_id, status);
create index if not exists idx_opt_exp_assignments on public.campaign_experiment_assignments(experiment_id, lead_id);

-- ROW LEVEL SECURITY POLICIES
alter table public.campaign_optimization_recommendations enable row level security;
alter table public.campaign_optimization_audits enable row level security;
alter table public.campaign_experiments enable row level security;
alter table public.campaign_experiment_variants enable row level security;
alter table public.campaign_experiment_assignments enable row level security;

-- Recommendations
drop policy if exists "Users can manage own recommendations" on public.campaign_optimization_recommendations;
create policy "Users can manage own recommendations"
  on public.campaign_optimization_recommendations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Audits
drop policy if exists "Users can manage own audits" on public.campaign_optimization_audits;
create policy "Users can manage own audits"
  on public.campaign_optimization_audits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Experiments
drop policy if exists "Users can manage own experiments" on public.campaign_experiments;
create policy "Users can manage own experiments"
  on public.campaign_experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Variants
drop policy if exists "Users can manage own variants" on public.campaign_experiment_variants;
create policy "Users can manage own variants"
  on public.campaign_experiment_variants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Assignments
drop policy if exists "Users can manage own assignments" on public.campaign_experiment_assignments;
create policy "Users can manage own assignments"
  on public.campaign_experiment_assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
