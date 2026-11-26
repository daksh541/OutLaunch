-- ==============================================================================
-- Migration: 20261126001100_sales_coaching_and_performance.sql
-- AI Sales Coaching & Rep Performance Analytics Module
-- Creates:
-- - sales_rep_scorecards
-- - sales_rep_skill_metrics
-- - sales_coaching_recommendations
-- - sales_coaching_plans
-- - sales_coaching_plan_actions
-- - sales_coaching_reviews
-- Row Level Security (RLS), Constraints, Foreign Keys & Indexes included.
-- ==============================================================================

-- 1. SALES REP SCORECARDS TABLE
create table if not exists public.sales_rep_scorecards (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  rep_user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  calls_analyzed integer not null default 0,
  discovery_score numeric(5, 2) not null default 0.0 check (discovery_score >= 0 and discovery_score <= 100),
  objection_handling_score numeric(5, 2) not null default 0.0 check (objection_handling_score >= 0 and objection_handling_score <= 100),
  value_proposition_score numeric(5, 2) not null default 0.0 check (value_proposition_score >= 0 and value_proposition_score <= 100),
  next_step_clarity_score numeric(5, 2) not null default 0.0 check (next_step_clarity_score >= 0 and next_step_clarity_score <= 100),
  listening_score numeric(5, 2) not null default 0.0 check (listening_score >= 0 and listening_score <= 100),
  overall_score numeric(5, 2) not null default 0.0 check (overall_score >= 0 and overall_score <= 100),
  confidence_level text not null default 'low' check (confidence_level in ('low', 'medium', 'high')),
  calculation_version text not null default 'v1.0.0',
  skill_breakdown jsonb default '{}'::jsonb,
  component_weights jsonb default '{"discovery": 0.20, "objection_handling": 0.20, "value_proposition": 0.15, "next_step_clarity": 0.15, "listening": 0.15, "qualification": 0.15}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint sales_rep_scorecards_rep_period_unique unique (rep_user_id, period_start, period_end)
);

-- 2. SALES REP SKILL METRICS TABLE (Individual skill time-series measurements)
create table if not exists public.sales_rep_skill_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  rep_user_id uuid not null references auth.users(id) on delete cascade,
  skill_key text not null check (skill_key in (
    'discovery',
    'active_listening',
    'objection_handling',
    'value_proposition',
    'qualification',
    'next_step_clarity',
    'call_structure'
  )),
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  measurement_period_start timestamp with time zone not null,
  measurement_period_end timestamp with time zone not null,
  sample_size integer not null default 1 check (sample_size >= 0),
  confidence_level text not null default 'low' check (confidence_level in ('low', 'medium', 'high')),
  evidence_call_ids jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SALES COACHING RECOMMENDATIONS TABLE (AI Multi-call observations & recommendations)
create table if not exists public.sales_coaching_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  rep_user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null default 'skill_improvement' check (recommendation_type in (
    'skill_improvement',
    'objection_mastery',
    'discovery_depth',
    'value_positioning',
    'closing_technique',
    'active_listening'
  )),
  title text not null,
  description text not null,
  skill_key text not null check (skill_key in (
    'discovery',
    'active_listening',
    'objection_handling',
    'value_proposition',
    'qualification',
    'next_step_clarity',
    'call_structure'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  supporting_call_ids jsonb default '[]'::jsonb,
  evidence_segments jsonb default '[]'::jsonb,
  suggested_behavior text,
  example_improvement text,
  confidence_score numeric(4, 2) default 0.85 check (confidence_score >= 0 and confidence_score <= 1.0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'completed')),
  dismissed_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. SALES COACHING PLANS TABLE (Structured development milestones)
create table if not exists public.sales_coaching_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  rep_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_skill text not null check (target_skill in (
    'discovery',
    'active_listening',
    'objection_handling',
    'value_proposition',
    'qualification',
    'next_step_clarity',
    'call_structure'
  )),
  baseline_score numeric(5, 2) default 0.0 check (baseline_score >= 0 and baseline_score <= 100),
  target_score numeric(5, 2) not null check (target_score >= 0 and target_score <= 100),
  current_score numeric(5, 2) default 0.0 check (current_score >= 0 and current_score <= 100),
  start_date date not null default current_date,
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  recommendation_id uuid references public.sales_coaching_recommendations(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. SALES COACHING PLAN ACTIONS TABLE (Action steps within a plan)
create table if not exists public.sales_coaching_plan_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  plan_id uuid not null references public.sales_coaching_plans(id) on delete cascade,
  title text not null,
  description text,
  action_type text not null default 'exercise' check (action_type in (
    'exercise',
    'call_review',
    'shadowing',
    'roleplay',
    'reading',
    'milestone'
  )),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  crm_task_id uuid references public.crm_tasks(id) on delete set null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. SALES COACHING REVIEWS TABLE (Manager or self-review feedback)
create table if not exists public.sales_coaching_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  rep_user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  review_type text not null default 'manager' check (review_type in ('manager', 'self', 'peer')),
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  strengths jsonb default '[]'::jsonb,
  improvement_areas jsonb default '[]'::jsonb,
  review_notes text not null default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Composite Indexes
create index if not exists idx_scorecards_rep_period on public.sales_rep_scorecards(rep_user_id, period_start, period_end);
create index if not exists idx_scorecards_workspace on public.sales_rep_scorecards(workspace_id);
create index if not exists idx_skill_metrics_rep_skill on public.sales_rep_skill_metrics(rep_user_id, skill_key, measurement_period_start);
create index if not exists idx_coaching_recommendations_rep on public.sales_coaching_recommendations(rep_user_id, status);
create index if not exists idx_coaching_plans_rep on public.sales_coaching_plans(rep_user_id, status);
create index if not exists idx_coaching_plan_actions_plan on public.sales_coaching_plan_actions(plan_id, status);
create index if not exists idx_coaching_reviews_rep on public.sales_coaching_reviews(rep_user_id, period_start);

-- Enable Row Level Security (RLS)
alter table public.sales_rep_scorecards enable row level security;
alter table public.sales_rep_skill_metrics enable row level security;
alter table public.sales_coaching_recommendations enable row level security;
alter table public.sales_coaching_plans enable row level security;
alter table public.sales_coaching_plan_actions enable row level security;
alter table public.sales_coaching_reviews enable row level security;

-- RLS Policies: Representatives can view their own scorecards, managers/workspace owners can view all in workspace
create policy "Reps can manage own scorecards"
  on public.sales_rep_scorecards for all
  using (auth.uid() = rep_user_id)
  with check (auth.uid() = rep_user_id);

create policy "Reps can manage own skill metrics"
  on public.sales_rep_skill_metrics for all
  using (auth.uid() = rep_user_id)
  with check (auth.uid() = rep_user_id);

create policy "Reps can manage own coaching recommendations"
  on public.sales_coaching_recommendations for all
  using (auth.uid() = rep_user_id)
  with check (auth.uid() = rep_user_id);

create policy "Reps can manage own coaching plans"
  on public.sales_coaching_plans for all
  using (auth.uid() = rep_user_id or auth.uid() = created_by)
  with check (auth.uid() = rep_user_id or auth.uid() = created_by);

create policy "Reps can manage own plan actions"
  on public.sales_coaching_plan_actions for all
  using (exists (
    select 1 from public.sales_coaching_plans p
    where p.id = plan_id and (p.rep_user_id = auth.uid() or p.created_by = auth.uid())
  ))
  with check (exists (
    select 1 from public.sales_coaching_plans p
    where p.id = plan_id and (p.rep_user_id = auth.uid() or p.created_by = auth.uid())
  ));

create policy "Users can manage reviews where they are rep or reviewer"
  on public.sales_coaching_reviews for all
  using (auth.uid() = rep_user_id or auth.uid() = reviewer_user_id)
  with check (auth.uid() = rep_user_id or auth.uid() = reviewer_user_id);
