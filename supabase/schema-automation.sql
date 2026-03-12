-- Shipcast Automation Engine Schema
-- Run in Supabase SQL editor AFTER github-schema.sql

-- ─────────────────────────────────────────────
-- 1. GitHub Releases
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  tag_name text NOT NULL,
  release_name text,
  body text,
  is_prerelease boolean DEFAULT false,
  is_draft boolean DEFAULT false,
  published_at timestamptz,
  commit_ids uuid[] DEFAULT '{}',        -- commits included in this release
  announcement_id uuid,                  -- FK set after announcement generated
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_full_name, tag_name)
);
CREATE INDEX IF NOT EXISTS idx_github_releases_user ON github_releases(clerk_user_id);

-- ─────────────────────────────────────────────
-- 2. Commit Groups
-- Groups of related commits that form one user-visible feature.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commit_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  title text NOT NULL,                   -- "Invoice Analytics"
  category text NOT NULL DEFAULT 'feature',
    -- feature | improvement | integration | performance | bugfix | release
  commit_ids uuid[] NOT NULL DEFAULT '{}',
  primary_commit_id uuid REFERENCES github_commits(id) ON DELETE SET NULL,
  release_id uuid REFERENCES github_releases(id) ON DELETE SET NULL,
  commit_type_counts jsonb DEFAULT '{}', -- {"feat":3,"fix":1}
  detected_keywords text[] DEFAULT '{}',
  signal_score numeric(4,3) DEFAULT 0,   -- 0.000–1.000
  is_marketable boolean DEFAULT false,
  status text DEFAULT 'pending',
    -- pending | processing | announced | ignored | duplicate
  source text DEFAULT 'github',          -- github | manual | release
  dedup_fingerprint text,               -- for exact-duplicate detection
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commit_groups_user ON commit_groups(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_commit_groups_status ON commit_groups(clerk_user_id, status);
CREATE INDEX IF NOT EXISTS idx_commit_groups_dedup ON commit_groups(clerk_user_id, dedup_fingerprint);

-- ─────────────────────────────────────────────
-- 3. Announcement Objects
-- The structured marketing announcement generated BEFORE platform posts.
-- This is the core intermediate layer in the pipeline.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  commit_group_id uuid REFERENCES commit_groups(id) ON DELETE CASCADE,
  update_id uuid REFERENCES updates(id) ON DELETE SET NULL,
  release_id uuid REFERENCES github_releases(id) ON DELETE SET NULL,

  -- Structured fields
  product_name text NOT NULL,
  feature_name text NOT NULL,
  headline text NOT NULL,              -- "Introducing Invoice Analytics for InvoiceHive"
  summary text NOT NULL,               -- 1-2 sentence user-facing description
  benefits text[] NOT NULL DEFAULT '{}', -- bullet list of user benefits
  story text,                          -- why we built it
  cta text DEFAULT 'Try it now',
  link text,                           -- product URL from profile

  -- Classification
  category text NOT NULL DEFAULT 'feature',
  audience text,                       -- "freelancers", "developers", "teams"
  tone_hint text,                      -- extra context for generation

  -- Pipeline state
  source text DEFAULT 'github',        -- github | manual | release
  dedup_hash text,                     -- semantic hash for near-duplicate detection
  content_generated boolean DEFAULT false,
  status text DEFAULT 'draft',         -- draft | approved | rejected | published

  -- Scores (filled after generation)
  best_tweet_score int,
  best_linkedin_score int,
  avg_score int,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_user ON announcement_objects(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcement_objects(clerk_user_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_dedup ON announcement_objects(clerk_user_id, dedup_hash);

-- FK back-references (set after announcement is generated)
ALTER TABLE github_releases ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES announcement_objects(id) ON DELETE SET NULL;
ALTER TABLE commit_groups ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES announcement_objects(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- 4. Content Scores
-- Per-format quality scores for generated_content rows.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id uuid REFERENCES generated_content(id) ON DELETE CASCADE,
  announcement_id uuid REFERENCES announcement_objects(id) ON DELETE SET NULL,
  format text NOT NULL,
    -- tweet | thread | linkedin | reddit | indie_hackers | blog_draft | email_body | changelog_entry
  score int NOT NULL CHECK (score >= 0 AND score <= 100),
  hook_strength int CHECK (hook_strength >= 0 AND hook_strength <= 25),
  clarity int CHECK (clarity >= 0 AND clarity <= 25),
  benefit_emphasis int CHECK (benefit_emphasis >= 0 AND benefit_emphasis <= 25),
  novelty int CHECK (novelty >= 0 AND novelty <= 25),
  feedback text,                        -- short suggestion for improvement
  needs_regeneration boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_scores_content ON content_scores(generated_content_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_scores_unique ON content_scores(generated_content_id, format);

-- ─────────────────────────────────────────────
-- 5. Pipeline Job Log
-- Tracks every step of the automation pipeline for debugging.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  job_type text NOT NULL,
    -- group_commits | detect_features | build_announcement | generate_content | score_content
  source_type text,                     -- commit_group | release | update | manual
  source_id uuid,
  status text DEFAULT 'running',        -- running | completed | failed | skipped
  input_summary text,
  output_summary text,
  error text,
  duration_ms int,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user ON pipeline_jobs(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs(status, created_at DESC);

-- ─────────────────────────────────────────────
-- RLS (disabled — service role only)
-- ─────────────────────────────────────────────
ALTER TABLE github_releases DISABLE ROW LEVEL SECURITY;
ALTER TABLE commit_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs DISABLE ROW LEVEL SECURITY;
