-- ==============================================================================
-- Migration: 20261126001000_sales_call_intelligence.sql
-- AI Sales Call Intelligence & Conversation Insights Module
-- Creates:
-- - sales_call_recordings
-- - sales_call_transcripts
-- - sales_call_transcript_segments
-- - sales_call_insights
-- - sales_call_action_items
-- - sales_call_crm_suggestions
-- Row Level Security (RLS) & Composite Indexes included.
-- ==============================================================================

-- 1. RECORDINGS TABLE
create table if not exists public.sales_call_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  deal_id uuid references public.crm_deals(id) on delete set null,
  meeting_id uuid references public.meeting_bookings(id) on delete set null,
  title text not null default 'Sales Discovery Call',
  file_name text not null,
  file_path text,
  file_size_bytes bigint default 0,
  mime_type text not null default 'audio/mpeg',
  duration_seconds integer default 0,
  audio_url text,
  checksum text,
  status text not null default 'uploaded',
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TRANSCRIPTS TABLE
create table if not exists public.sales_call_transcripts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sales_call_recordings(id) on delete cascade unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_text text not null default '',
  language text default 'en',
  provider text default 'whisper',
  confidence numeric default 1.0,
  duration_seconds integer default 0,
  word_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TRANSCRIPT SEGMENTS TABLE (Speaker Diarized)
create table if not exists public.sales_call_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.sales_call_transcripts(id) on delete cascade,
  call_id uuid not null references public.sales_call_recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  segment_order integer not null default 0,
  speaker text not null default 'sales_rep',
  speaker_name text,
  start_time numeric not null default 0.0,
  end_time numeric not null default 0.0,
  text text not null default '',
  sentiment text default 'neutral',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. INSIGHTS TABLE
create table if not exists public.sales_call_insights (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sales_call_recordings(id) on delete cascade unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null default '',
  executive_summary text not null default '',
  key_takeaways jsonb default '[]'::jsonb,
  pain_points jsonb default '[]'::jsonb,
  objections jsonb default '[]'::jsonb,
  buying_signals jsonb default '[]'::jsonb,
  competitors jsonb default '[]'::jsonb,
  requirements jsonb default '[]'::jsonb,
  deal_risk_score integer default 0,
  deal_risk_level text default 'low',
  deal_risk_factors jsonb default '[]'::jsonb,
  call_quality_score integer default 0,
  call_quality_breakdown jsonb default '{}'::jsonb,
  sentiment_overall text default 'neutral',
  prospect_engagement_score integer default 0,
  model text default 'gpt-4o-mini',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ACTION ITEMS TABLE
create table if not exists public.sales_call_action_items (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sales_call_recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  description text,
  assignee text default 'rep',
  due_date date,
  priority text default 'medium',
  status text not null default 'pending',
  crm_task_id uuid references public.crm_tasks(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CRM SUGGESTIONS TABLE (Approval Workflow)
create table if not exists public.sales_call_crm_suggestions (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sales_call_recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  suggestion_type text not null default 'stage_update',
  field_name text,
  current_value text,
  proposed_value text,
  reason text,
  confidence numeric default 0.8,
  status text not null default 'pending',
  applied_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_sales_call_recordings_user on public.sales_call_recordings(user_id, status);
create index if not exists idx_sales_call_recordings_lead on public.sales_call_recordings(lead_id);
create index if not exists idx_sales_call_recordings_deal on public.sales_call_recordings(deal_id);
create index if not exists idx_sales_call_recordings_checksum on public.sales_call_recordings(user_id, checksum);
create index if not exists idx_sales_call_segments_call on public.sales_call_transcript_segments(call_id, segment_order);
create index if not exists idx_sales_call_action_items_user on public.sales_call_action_items(user_id, status);
create index if not exists idx_sales_call_crm_suggestions_call on public.sales_call_crm_suggestions(call_id, status);

-- Enable RLS
alter table public.sales_call_recordings enable row level security;
alter table public.sales_call_transcripts enable row level security;
alter table public.sales_call_transcript_segments enable row level security;
alter table public.sales_call_insights enable row level security;
alter table public.sales_call_action_items enable row level security;
alter table public.sales_call_crm_suggestions enable row level security;

-- RLS Policies
create policy "Users can manage own sales call recordings"
  on public.sales_call_recordings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sales call transcripts"
  on public.sales_call_transcripts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sales call transcript segments"
  on public.sales_call_transcript_segments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sales call insights"
  on public.sales_call_insights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sales call action items"
  on public.sales_call_action_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sales call crm suggestions"
  on public.sales_call_crm_suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
