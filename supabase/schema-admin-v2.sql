-- =========================================================
-- Admin Schema v2 — Run in Supabase SQL Editor
-- =========================================================

-- Feature flags (toggle app behaviour without deploys)
create table if not exists feature_flags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,             -- e.g. 'github_auto_generate'
  description text,
  enabled     boolean not null default false,
  plans       text[]   not null default '{}',   -- [] = all plans; ['pro','studio'] = gated
  created_by  text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Seed default flags
insert into feature_flags (name, description, enabled, plans) values
  ('github_integration',        'GitHub commit tracking & marketing events',    true,  '{}'),
  ('ai_blog_generation',        'Long-form blog post generation from commits',  true,  '{"pro","studio"}'),
  ('launch_kit',                'Full launch kit (email, changelog, thread)',    true,  '{"pro","studio"}'),
  ('content_plan',              '30-day content planning',                       true,  '{"pro","studio"}'),
  ('scheduled_posting',         'Schedule posts to social accounts',             true,  '{"pro","studio"}'),
  ('startup_radar',             'Startup radar / market intelligence',           true,  '{"studio"}'),
  ('direct_twitter_post',       'Post directly to Twitter/X',                    true,  '{"studio"}'),
  ('direct_linkedin_post',      'Post directly to LinkedIn',                     true,  '{"studio"}'),
  ('maintenance_mode',          'Put entire app into maintenance mode',          false, '{}')
on conflict (name) do nothing;

-- Announcements / system banners shown to users
create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  body          text,
  type          text        not null default 'info',   -- info | warning | success | error
  target_plans  text[]      not null default '{}',     -- [] = all; ['pro'] = pro only
  active        boolean     not null default false,
  dismissible   boolean     not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  cta_label     text,                                   -- optional button label
  cta_href      text,                                   -- optional button URL
  created_by    text        not null,
  created_at    timestamptz not null default now()
);

-- Track which users have dismissed an announcement
create table if not exists announcement_dismissals (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid        not null references announcements(id) on delete cascade,
  clerk_user_id   text        not null,
  dismissed_at    timestamptz not null default now(),
  unique (announcement_id, clerk_user_id)
);

-- AI / LLM generation logs (cost & usage monitoring)
create table if not exists ai_generation_logs (
  id                uuid primary key default gen_random_uuid(),
  clerk_user_id     text        not null,
  endpoint          text        not null,  -- generate | improve | bio | launch-kit | github-event | content-plan
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  duration_ms       integer,
  success           boolean     not null default true,
  error             text,
  created_at        timestamptz not null default now()
);
create index if not exists ai_logs_user_idx     on ai_generation_logs(clerk_user_id);
create index if not exists ai_logs_created_idx  on ai_generation_logs(created_at desc);
create index if not exists ai_logs_endpoint_idx on ai_generation_logs(endpoint);

-- Configurable per-plan limits (admin can adjust without deploy)
create table if not exists plan_limits (
  id                    uuid primary key default gen_random_uuid(),
  plan                  text unique not null,  -- free | pro | studio
  updates_per_month     integer,               -- null = unlimited
  scheduled_posts_limit integer,
  github_repos_limit    integer,
  ai_calls_per_day      integer,
  content_formats       integer,
  updated_by            text,
  updated_at            timestamptz not null default now()
);

insert into plan_limits (plan, updates_per_month, scheduled_posts_limit, github_repos_limit, ai_calls_per_day, content_formats) values
  ('free',   5,    10,  1,  10,  4),
  ('pro',    50,   100, 5,  100, 8),
  ('studio', null, null, null, null, 8)
on conflict (plan) do nothing;

-- Disable RLS (service role only)
alter table feature_flags            disable row level security;
alter table announcements            disable row level security;
alter table announcement_dismissals  disable row level security;
alter table ai_generation_logs       disable row level security;
alter table plan_limits              disable row level security;
