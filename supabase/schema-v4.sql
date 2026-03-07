-- Run in Supabase SQL editor

-- Expand generated_content to 8 formats
alter table generated_content
  add column if not exists blog_draft text,
  add column if not exists email_subject text,
  add column if not exists email_body text,
  add column if not exists changelog_entry text;

-- 30-day content plans
create table if not exists content_plans (
  id uuid default gen_random_uuid() primary key,
  clerk_user_id text not null,
  theme text not null,
  start_date date not null,
  days jsonb not null,
  created_at timestamptz default now()
);

create index if not exists content_plans_user_idx on content_plans(clerk_user_id);
alter table content_plans disable row level security;

-- GitHub connections
create table if not exists github_connections (
  id uuid default gen_random_uuid() primary key,
  clerk_user_id text not null unique,
  access_token text not null,
  repo_full_name text,
  webhook_id text,
  auto_generate boolean default true,
  auto_schedule boolean default false,
  created_at timestamptz default now()
);

alter table github_connections disable row level security;