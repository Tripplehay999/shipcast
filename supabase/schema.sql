-- Shipcast Database Schema
-- Run this in your Supabase SQL editor

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  product_name text not null,
  product_description text not null,
  brand_voice text not null default 'casual' check (brand_voice in ('casual', 'professional', 'developer')),
  example_posts text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Updates table
create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  raw_update text not null,
  created_at timestamptz default now()
);

-- Generated content table
create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references updates(id) on delete cascade,
  tweet text not null,
  thread text[] not null,
  linkedin text not null,
  reddit text not null,
  indie_hackers text not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists updates_clerk_user_id_idx on updates(clerk_user_id);
create index if not exists updates_created_at_idx on updates(created_at desc);
create index if not exists generated_content_update_id_idx on generated_content(update_id);

-- RLS (Row Level Security)
-- Since we use service role key server-side, we disable RLS for simplicity.
-- If you want user-level RLS, enable it and add policies using clerk_user_id.
alter table profiles disable row level security;
alter table updates disable row level security;
alter table generated_content disable row level security;
