export type BrandVoice = "casual" | "professional" | "developer";

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  product_name: string;
  product_description: string;
  brand_voice: BrandVoice;
  example_posts: string[];
  created_at: string;
}

export interface Update {
  id: string;
  clerk_user_id: string;
  raw_update: string;
  created_at: string;
  generated_content?: GeneratedContent;
}

export interface GeneratedContent {
  id: string;
  update_id: string;
  tweet: string;
  thread: string[];
  linkedin: string;
  reddit: string;
  indie_hackers: string;
  blog_draft: string;
  email_subject: string;
  email_body: string;
  changelog_entry: string;
  created_at: string;
}

export interface GenerateRequest {
  rawUpdate: string;
  productName: string;
  productDescription: string;
  brandVoice: BrandVoice;
  examplePosts: string[];
}

export interface GenerateResponse {
  tweet: string;
  thread: string[];
  linkedin: string;
  reddit: string;
  indie_hackers: string;
  blog_draft: string;
  email_subject: string;
  email_body: string;
  changelog_entry: string;
}

export interface ContentPlanDay {
  day: number;
  format: "tweet" | "thread" | "linkedin" | "reddit" | "indie_hackers" | "blog_draft" | "email_body";
  topic: string;
  hook: string;
  draft: string;
  scheduled_post_id?: string | null;
}

// ─── Automation pipeline types ──────────────────────────────────────────────

export type CommitCategory =
  | "feature"
  | "improvement"
  | "integration"
  | "performance"
  | "bugfix"
  | "release"
  | "internal";

export interface CommitGroup {
  id: string;
  clerk_user_id: string;
  repo_full_name: string;
  title: string;
  category: CommitCategory;
  commit_ids: string[];
  primary_commit_id: string | null;
  release_id: string | null;
  signal_score: number;
  is_marketable: boolean;
  status: "pending" | "processing" | "announced" | "ignored" | "duplicate";
  source: "github" | "manual" | "release";
  announcement_id: string | null;
  created_at: string;
}

export interface AnnouncementObject {
  id: string;
  clerk_user_id: string;
  commit_group_id: string | null;
  update_id: string | null;
  release_id: string | null;
  product_name: string;
  feature_name: string;
  headline: string;
  summary: string;
  benefits: string[];
  story: string | null;
  cta: string;
  link: string | null;
  category: CommitCategory | "release";
  audience: string | null;
  tone_hint: string | null;
  source: "github" | "manual" | "release";
  dedup_hash: string | null;
  content_generated: boolean;
  status: "draft" | "approved" | "rejected" | "published";
  best_tweet_score: number | null;
  best_linkedin_score: number | null;
  avg_score: number | null;
  created_at: string;
}

export interface ContentScore {
  id: string;
  generated_content_id: string;
  announcement_id: string | null;
  format: string;
  score: number;
  hook_strength: number;
  clarity: number;
  benefit_emphasis: number;
  novelty: number;
  feedback: string | null;
  needs_regeneration: boolean;
  created_at: string;
}

export interface PipelineResult {
  commitGroupId: string;
  announcementId: string | null;
  generatedContentId: string | null;
  scores: ContentScore[];
  status: "success" | "skipped" | "error";
  skipReason?: string;
  error?: string;
}
