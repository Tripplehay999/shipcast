-- Run this in Supabase SQL editor

-- Saved launch kits
create table if not exists launch_kits (
  id uuid default gen_random_uuid() primary key,
  clerk_user_id text not null,
  description text not null,
  kit jsonb not null,
  created_at timestamp with time zone default now()
);

create index if not exists launch_kits_user_idx on launch_kits(clerk_user_id);

alter table launch_kits disable row level security;
