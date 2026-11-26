-- ==============================================================================
-- Migration: 20261126000900_meeting_booking.sql
-- AI Meeting Booking & Calendar Scheduling Module
-- Creates:
-- - calendar_connections
-- - meeting_availability_rules
-- - meeting_booking_pages
-- - meeting_bookings
-- - meeting_reminders
-- - meeting_outcomes
-- Row Level Security (RLS) & Composite Indexes included.
-- ==============================================================================

-- 1. CALENDAR CONNECTIONS TABLE (Google OAuth & Calendar Sync)
create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  account_email text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  calendar_id text default 'primary',
  calendar_name text default 'Primary Calendar',
  is_primary boolean default true,
  status text default 'connected',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint calendar_connections_user_account_unique unique (user_id, account_email, provider)
);

-- 2. USER AVAILABILITY RULES TABLE (Working hours, buffers, horizons)
create table if not exists public.meeting_availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  working_days jsonb default '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
  working_hours_start text default '09:00',
  working_hours_end text default '17:00',
  time_zone text default 'UTC',
  meeting_duration integer default 30,
  min_notice_hours integer default 4,
  max_horizon_days integer default 30,
  buffer_before integer default 10,
  buffer_after integer default 10,
  availability_calendar_id text default 'primary',
  booking_calendar_id text default 'primary',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. MEETING BOOKING PAGES TABLE (Public booking slugs & settings)
create table if not exists public.meeting_booking_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null default 'Product Demo & Discovery',
  description text default 'Meet with our team to explore high-impact B2B outreach solutions.',
  duration_minutes integer default 30,
  is_active boolean default true,
  theme_color text default '#0d9467',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. MEETING BOOKINGS TABLE (Scheduled meetings with calendar provider event IDs)
create table if not exists public.meeting_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_page_id uuid references public.meeting_booking_pages(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  prospect_name text not null,
  prospect_email text not null,
  prospect_company text,
  prospect_notes text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  time_zone text default 'UTC',
  status text default 'confirmed',
  cancellation_reason text,
  provider text default 'google',
  provider_event_id text,
  meeting_link text,
  idempotency_key text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. MEETING REMINDERS TABLE (Idempotent notification reminders)
create table if not exists public.meeting_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.meeting_bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null, -- '24h', '1h', '15m'
  scheduled_at timestamp with time zone not null,
  status text default 'pending', -- 'pending', 'sent', 'cancelled'
  sent_at timestamp with time zone,
  idempotency_key text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. MEETING OUTCOMES TABLE (Post-meeting dispositions & feedback)
create table if not exists public.meeting_outcomes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.meeting_bookings(id) on delete cascade unique,
  lead_id uuid references public.leads(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null,
  notes text,
  next_action text,
  next_followup_at timestamp with time zone,
  deal_value numeric default 0.0,
  expected_close_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.calendar_connections enable row level security;
alter table public.meeting_availability_rules enable row level security;
alter table public.meeting_booking_pages enable row level security;
alter table public.meeting_bookings enable row level security;
alter table public.meeting_reminders enable row level security;
alter table public.meeting_outcomes enable row level security;

-- Calendar Connections: User isolation
drop policy if exists "calendar_connections_user_isolation" on public.calendar_connections;
create policy "calendar_connections_user_isolation" on public.calendar_connections
  for all using (auth.uid() = user_id);

-- Availability Rules: User isolation
drop policy if exists "meeting_availability_rules_user_isolation" on public.meeting_availability_rules;
create policy "meeting_availability_rules_user_isolation" on public.meeting_availability_rules
  for all using (auth.uid() = user_id);

-- Booking Pages: Owner management + public read for active slugs
drop policy if exists "meeting_booking_pages_user_isolation" on public.meeting_booking_pages;
create policy "meeting_booking_pages_user_isolation" on public.meeting_booking_pages
  for all using (auth.uid() = user_id);

drop policy if exists "meeting_booking_pages_public_read" on public.meeting_booking_pages;
create policy "meeting_booking_pages_public_read" on public.meeting_booking_pages
  for select using (is_active = true);

-- Bookings: Owner isolation
drop policy if exists "meeting_bookings_user_isolation" on public.meeting_bookings;
create policy "meeting_bookings_user_isolation" on public.meeting_bookings
  for all using (auth.uid() = user_id);

-- Reminders: Owner isolation
drop policy if exists "meeting_reminders_user_isolation" on public.meeting_reminders;
create policy "meeting_reminders_user_isolation" on public.meeting_reminders
  for all using (auth.uid() = user_id);

-- Outcomes: Owner isolation
drop policy if exists "meeting_outcomes_user_isolation" on public.meeting_outcomes;
create policy "meeting_outcomes_user_isolation" on public.meeting_outcomes
  for all using (auth.uid() = user_id);

-- 8. INDEXES FOR HIGH-THROUGHPUT SEARCH & SCHEDULING
create index if not exists idx_calendar_connections_user on public.calendar_connections (user_id);
create index if not exists idx_meeting_booking_pages_slug on public.meeting_booking_pages (slug);
create index if not exists idx_meeting_bookings_user_start on public.meeting_bookings (user_id, start_time);
create index if not exists idx_meeting_bookings_lead on public.meeting_bookings (lead_id);
create index if not exists idx_meeting_bookings_status on public.meeting_bookings (status);
create index if not exists idx_meeting_reminders_status_time on public.meeting_reminders (status, scheduled_at);
create index if not exists idx_meeting_outcomes_lead on public.meeting_outcomes (lead_id);
