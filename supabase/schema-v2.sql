-- Shipcast Schema v2 — run this in Supabase SQL editor AFTER schema.sql

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Connected social accounts
create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  platform text not null check (platform in ('twitter', 'linkedin')),
  platform_user_id text not null,
  platform_username text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(clerk_user_id, platform)
);

-- Scheduled / posted posts
create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  update_id uuid references updates(id) on delete set null,
  platform text not null check (platform in ('twitter', 'linkedin')),
  content text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed')),
  posted_at timestamptz,
  error text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists subscriptions_clerk_user_id_idx on subscriptions(clerk_user_id);
create index if not exists connected_accounts_clerk_user_id_idx on connected_accounts(clerk_user_id);
create index if not exists scheduled_posts_clerk_user_id_idx on scheduled_posts(clerk_user_id);
create index if not exists scheduled_posts_status_idx on scheduled_posts(status) where status = 'pending';
create index if not exists scheduled_posts_scheduled_at_idx on scheduled_posts(scheduled_at);

-- Disable RLS (service role used server-side)
alter table subscriptions disable row level security;
alter table connected_accounts disable row level security;
alter table scheduled_posts disable row level security;
