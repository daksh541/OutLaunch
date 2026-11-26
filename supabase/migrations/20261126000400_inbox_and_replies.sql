-- ==============================================================================
-- Outreach SaaS Inbox & Reply Management Schema
-- Tables:
--   1. email_conversations: Threaded conversation between user and prospect lead
--   2. email_inbound_messages: Raw and parsed inbound emails from webhook/adapter
--   3. conversation_messages: Unified chronological messages (both sent & received)
-- Features: Row Level Security (RLS), unique provider event IDs, performance indexes
-- ==============================================================================

-- 1. EMAIL_CONVERSATIONS TABLE
create table if not exists public.email_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  prospect_email text not null,
  prospect_name text,
  subject text not null,
  status text not null default 'all', -- 'interested', 'not_interested', 'question', 'referral', 'out_of_office', 'unmatched', 'all'
  unread boolean not null default true,
  last_message_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ai_classification text, -- 'Interested', 'Not Interested', 'Asking a question', 'Referral', 'Out of office', 'Unsubscribe request', 'Other'
  ai_confidence numeric default 0.9,
  ai_summary text,
  ai_suggested_next_action text,
  suggested_reply_draft text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint email_conversations_user_prospect_unique unique (user_id, prospect_email)
);

-- 2. EMAIL_INBOUND_MESSAGES TABLE
create table if not exists public.email_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.email_conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  provider_event_id text not null, -- Unique webhook event id to prevent duplicate ingestion
  provider_message_id text,
  in_reply_to text,
  references_header text,
  sender_email text not null,
  sender_name text,
  recipient_email text not null,
  subject text not null,
  text_body text,
  html_body text,
  headers jsonb default '{}'::jsonb,
  raw_payload jsonb default '{}'::jsonb,
  is_matched boolean not null default false,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint inbound_provider_event_unique unique (provider_event_id)
);

-- 3. CONVERSATION_MESSAGES TABLE (Chronological thread history)
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.email_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null default 'inbound', -- 'outbound' or 'inbound'
  sender text not null,
  sender_email text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  provider_message_id text,
  in_reply_to text,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING & THREAD LOOKUPS
-- ==============================================================================
create index if not exists idx_email_conversations_user on public.email_conversations(user_id);
create index if not exists idx_email_conversations_status on public.email_conversations(user_id, status);
create index if not exists idx_email_conversations_unread on public.email_conversations(user_id, unread);
create index if not exists idx_email_conversations_lead on public.email_conversations(lead_id);
create index if not exists idx_email_conversations_prospect on public.email_conversations(prospect_email);
create index if not exists idx_email_inbound_provider_event on public.email_inbound_messages(provider_event_id);
create index if not exists idx_conversation_messages_thread on public.conversation_messages(conversation_id, sent_at asc);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.email_conversations enable row level security;
alter table public.email_inbound_messages enable row level security;
alter table public.conversation_messages enable row level security;

-- EMAIL_CONVERSATIONS RLS
drop policy if exists "Users can manage own conversations" on public.email_conversations;
create policy "Users can manage own conversations"
  on public.email_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EMAIL_INBOUND_MESSAGES RLS
drop policy if exists "Users can manage own inbound messages" on public.email_inbound_messages;
create policy "Users can manage own inbound messages"
  on public.email_inbound_messages for all
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- CONVERSATION_MESSAGES RLS
drop policy if exists "Users can manage own conversation messages" on public.conversation_messages;
create policy "Users can manage own conversation messages"
  on public.conversation_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
