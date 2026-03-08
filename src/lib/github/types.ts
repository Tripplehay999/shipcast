export type CommitType =
  | "feature"
  | "fix"
  | "chore"
  | "docs"
  | "refactor"
  | "test"
  | "perf"
  | "unknown";

export type EventType =
  | "feature_release"
  | "bug_fix"
  | "performance"
  | "integration"
  | "analytics"
  | "security"
  | "ux_improvement"
  | "api_change"
  | "infrastructure"
  | "other";

export interface NormalizedCommit {
  id: string;
  repo: string;
  sha: string;
  message: string;
  title: string;
  body: string | null;
  author_name: string;
  author_email: string;
  committed_at: string;
  commit_type: CommitType;
  is_marketable: boolean;
  marketing_score: number;
  detected_keywords: string[];
  branch: string;
  source: string;
}

export interface MarketingEventCandidate {
  id: string;
  clerk_user_id: string;
  commit_id: string;
  repo_full_name: string;
  event_type: EventType;
  short_summary: string;
  product_area: string | null;
  audience_value: string | null;
  likely_audience: string | null;
  launch_worthy: boolean;
  confidence: number;
  status: string;
}

export interface DBCommit {
  id: string;
  clerk_user_id: string;
  repo_full_name: string;
  sha: string;
  message: string;
  title: string;
  body: string | null;
  author_name: string | null;
  author_email: string | null;
  committed_at: string;
  branch: string;
  commit_type: CommitType;
  is_marketable: boolean;
  marketing_score: number;
  detected_keywords: string[];
  status: "pending" | "promoted" | "ignored";
  source: string;
  created_at: string;
}

export interface DBMarketingEvent {
  id: string;
  clerk_user_id: string;
  commit_id: string;
  repo_full_name: string;
  event_type: EventType;
  short_summary: string;
  product_area: string | null;
  audience_value: string | null;
  likely_audience: string | null;
  launch_worthy: boolean;
  confidence: number;
  status: string;
  created_at: string;
  commit: DBCommit;
}
