-- ==============================================================================
-- Standalone SQL Runner: AI Sales Forecasting & Revenue Intelligence Setup
-- Run this in Supabase SQL Editor if applying migrations outside CLI.
-- ==============================================================================

-- 1. HISTORICAL FORECAST SNAPSHOTS
create table if not exists public.sales_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  created_by uuid references auth.users(id) on delete set null,
  forecast_period_start timestamp with time zone not null,
  forecast_period_end timestamp with time zone not null,
  forecast_type text not null default 'weighted_pipeline' check (
    forecast_type in ('pipeline_based', 'weighted_pipeline', 'ai_predicted', 'manager_adjusted')
  ),
  forecast_amount numeric(14,2) not null default 0.0,
  committed_amount numeric(14,2) not null default 0.0,
  best_case_amount numeric(14,2) not null default 0.0,
  pipeline_amount numeric(14,2) not null default 0.0,
  weighted_pipeline_amount numeric(14,2) not null default 0.0,
  currency text not null default 'USD',
  deal_count integer not null default 0,
  model_version text not null default 'v1.0.0',
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. DEAL-LEVEL FORECAST PREDICTIONS
create table if not exists public.sales_forecast_deal_predictions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  snapshot_id uuid references public.sales_forecast_snapshots(id) on delete cascade,
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  predicted_close_probability numeric(5,2) not null check (predicted_close_probability >= 0 and predicted_close_probability <= 100),
  predicted_revenue numeric(14,2) not null default 0.0,
  predicted_close_date timestamp with time zone,
  forecast_category text not null default 'Pipeline' check (
    forecast_category in ('Pipeline', 'Best Case', 'Commit', 'Closed Won', 'Closed Lost')
  ),
  risk_score numeric(5,2) not null default 0.0 check (risk_score >= 0 and risk_score <= 100),
  risk_factors jsonb not null default '[]'::jsonb,
  positive_signals jsonb not null default '[]'::jsonb,
  model_version text not null default 'v1.0.0',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. MANUAL FORECAST ADJUSTMENTS & AUDIT LOG
create table if not exists public.sales_forecast_adjustments (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  snapshot_id uuid references public.sales_forecast_snapshots(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete set null,
  adjusted_by uuid not null references auth.users(id) on delete cascade,
  adjustment_type text not null default 'category_override',
  original_value jsonb not null,
  adjusted_value jsonb not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REVENUE ATTRIBUTION
create table if not exists public.sales_revenue_attribution (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  attribution_source text not null default 'campaign_outreach',
  attribution_model text not null default 'first_touch',
  attributed_revenue numeric(14,2) not null default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. REVENUE TARGETS & PIPELINE COVERAGE SETTINGS
create table if not exists public.sales_revenue_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default-workspace',
  period_type text not null default 'monthly' check (period_type in ('monthly', 'quarterly', 'annual')),
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  target_revenue numeric(14,2) not null default 100000.0,
  currency text not null default 'USD',
  target_pipeline_coverage numeric(4,2) not null default 3.0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint sales_revenue_targets_period_unique unique (workspace_id, period_type, period_start, period_end)
);

-- INDEXES
create index if not exists idx_forecast_snapshots_workspace on public.sales_forecast_snapshots(workspace_id, forecast_period_start, forecast_period_end);
create index if not exists idx_forecast_predictions_snapshot on public.sales_forecast_deal_predictions(snapshot_id);
create index if not exists idx_forecast_predictions_deal on public.sales_forecast_deal_predictions(deal_id);
create index if not exists idx_forecast_adjustments_snapshot on public.sales_forecast_adjustments(snapshot_id);
create index if not exists idx_forecast_adjustments_deal on public.sales_forecast_adjustments(deal_id);
create index if not exists idx_revenue_attribution_deal on public.sales_revenue_attribution(deal_id);
create index if not exists idx_revenue_attribution_campaign on public.sales_revenue_attribution(campaign_id);
create index if not exists idx_revenue_attribution_lead on public.sales_revenue_attribution(lead_id);
create index if not exists idx_revenue_targets_workspace on public.sales_revenue_targets(workspace_id, period_start);

-- ROW LEVEL SECURITY (RLS)
alter table public.sales_forecast_snapshots enable row level security;
alter table public.sales_forecast_deal_predictions enable row level security;
alter table public.sales_forecast_adjustments enable row level security;
alter table public.sales_revenue_attribution enable row level security;
alter table public.sales_revenue_targets enable row level security;

-- Policies
drop policy if exists "Users can view workspace forecast snapshots" on public.sales_forecast_snapshots;
create policy "Users can view workspace forecast snapshots"
  on public.sales_forecast_snapshots for select
  using (true);

drop policy if exists "Users can insert workspace forecast snapshots" on public.sales_forecast_snapshots;
create policy "Users can insert workspace forecast snapshots"
  on public.sales_forecast_snapshots for insert
  with check (auth.uid() = created_by or created_by is null);

drop policy if exists "Users can view forecast deal predictions" on public.sales_forecast_deal_predictions;
create policy "Users can view forecast deal predictions"
  on public.sales_forecast_deal_predictions for select
  using (true);

drop policy if exists "Users can insert forecast deal predictions" on public.sales_forecast_deal_predictions;
create policy "Users can insert forecast deal predictions"
  on public.sales_forecast_deal_predictions for insert
  with check (true);

drop policy if exists "Users can view forecast adjustments" on public.sales_forecast_adjustments;
create policy "Users can view forecast adjustments"
  on public.sales_forecast_adjustments for select
  using (true);

drop policy if exists "Users can insert forecast adjustments" on public.sales_forecast_adjustments;
create policy "Users can insert forecast adjustments"
  on public.sales_forecast_adjustments for insert
  with check (auth.uid() = adjusted_by);

drop policy if exists "Users can view revenue attribution" on public.sales_revenue_attribution;
create policy "Users can view revenue attribution"
  on public.sales_revenue_attribution for select
  using (true);

drop policy if exists "Users can manage revenue attribution" on public.sales_revenue_attribution;
create policy "Users can manage revenue attribution"
  on public.sales_revenue_attribution for all
  using (true)
  with check (true);

drop policy if exists "Users can view revenue targets" on public.sales_revenue_targets;
create policy "Users can view revenue targets"
  on public.sales_revenue_targets for select
  using (true);

drop policy if exists "Users can manage revenue targets" on public.sales_revenue_targets;
create policy "Users can manage revenue targets"
  on public.sales_revenue_targets for all
  using (true)
  with check (true);
