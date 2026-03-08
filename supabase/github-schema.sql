-- github_repositories (repo metadata, separate from auth tokens)
CREATE TABLE IF NOT EXISTS github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  repo_id bigint,
  owner text NOT NULL,
  name text NOT NULL,
  default_branch text DEFAULT 'main',
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clerk_user_id, repo_full_name)
);

-- github_commits (normalized commit storage)
CREATE TABLE IF NOT EXISTS github_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  sha text NOT NULL,
  message text NOT NULL,
  title text NOT NULL,
  body text,
  author_name text,
  author_email text,
  committed_at timestamptz NOT NULL,
  branch text NOT NULL DEFAULT 'main',
  commit_type text NOT NULL DEFAULT 'unknown',
  is_marketable boolean DEFAULT false,
  marketing_score numeric(3,2) DEFAULT 0,
  detected_keywords text[] DEFAULT '{}',
  status text DEFAULT 'pending',
  source text DEFAULT 'webhook',
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_full_name, sha)
);
CREATE INDEX IF NOT EXISTS idx_github_commits_user ON github_commits(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_marketable ON github_commits(clerk_user_id, is_marketable);

-- marketing_event_candidates
CREATE TABLE IF NOT EXISTS marketing_event_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  commit_id uuid REFERENCES github_commits(id) ON DELETE CASCADE,
  repo_full_name text NOT NULL,
  event_type text NOT NULL DEFAULT 'other',
  short_summary text NOT NULL,
  product_area text,
  audience_value text,
  likely_audience text,
  launch_worthy boolean DEFAULT false,
  confidence numeric(3,2) DEFAULT 0,
  status text DEFAULT 'needs_review',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mec_user_status ON marketing_event_candidates(clerk_user_id, status);

-- webhook_deliveries (raw payload storage for debugging)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  delivery_id text,
  repo_full_name text,
  raw_payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_repo ON webhook_deliveries(repo_full_name);

-- sync_runs (track manual syncs)
CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  status text DEFAULT 'running',
  commits_found int DEFAULT 0,
  commits_new int DEFAULT 0,
  error text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- github_notifications (existing - keep for layout badge count)
CREATE TABLE IF NOT EXISTS github_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  repo_full_name text NOT NULL,
  commit_messages text[] NOT NULL,
  summary text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
