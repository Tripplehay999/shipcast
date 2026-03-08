import type { CommitType, NormalizedCommit } from "./types";

// ─── Commit type detection ────────────────────────────────────────────────────

const COMMIT_TYPE_PATTERNS: Array<[RegExp, CommitType]> = [
  [/^feat(\([^)]+\))?[!:]/, "feature"],
  [/^feature(\([^)]+\))?[!:]/, "feature"],
  [/^add(\([^)]+\))?[!:]/, "feature"],
  [/^fix(\([^)]+\))?[!:]/, "fix"],
  [/^bugfix(\([^)]+\))?[!:]/, "fix"],
  [/^hotfix(\([^)]+\))?[!:]/, "fix"],
  [/^perf(\([^)]+\))?[!:]/, "perf"],
  [/^refactor(\([^)]+\))?[!:]/, "refactor"],
  [/^docs(\([^)]+\))?[!:]/, "docs"],
  [/^doc(\([^)]+\))?[!:]/, "docs"],
  [/^chore(\([^)]+\))?[!:]/, "chore"],
  [/^ci(\([^)]+\))?[!:]/, "chore"],
  [/^build(\([^)]+\))?[!:]/, "chore"],
  [/^style(\([^)]+\))?[!:]/, "chore"],
  [/^revert(\([^)]+\))?[!:]/, "chore"],
  [/^test(\([^)]+\))?[!:]/, "test"],
  [/^tests(\([^)]+\))?[!:]/, "test"],
];

export function detectCommitType(message: string): CommitType {
  const lower = message.toLowerCase().trimStart();
  for (const [pattern, type] of COMMIT_TYPE_PATTERNS) {
    if (pattern.test(lower)) return type;
  }
  return "unknown";
}

// ─── Strip conventional commit prefix ────────────────────────────────────────

export function stripPrefix(message: string): { title: string; body: string | null } {
  const lines = message.split("\n");
  const firstLine = lines[0].trim();
  const title = firstLine.replace(/^\w+(\([^)]+\))?[!]?:\s*/i, "").trim() || firstLine;
  const rest = lines.slice(1).join("\n").trim();
  return { title, body: rest || null };
}

// ─── High/low signal keyword lists ───────────────────────────────────────────

const HIGH_SIGNAL_KEYWORDS = [
  "launch",
  "payment",
  "stripe",
  "auth",
  "authentication",
  "analytics",
  "integration",
  "ai",
  "dashboard",
  "api",
  "search",
  "collaboration",
  "notification",
  "export",
  "performance",
  "onboarding",
  "billing",
  "subscription",
  "oauth",
  "webhook",
  "realtime",
  "mobile",
  "security",
  "encryption",
  "public",
  "release",
  "new",
  "improved",
  "faster",
];

const LOW_SIGNAL_KEYWORDS = [
  "typo",
  "bump",
  "dependency",
  "dependencies",
  "lint",
  "wip",
  "minor",
  "cleanup",
  "whitespace",
  "format",
  "prettier",
  "eslint",
];

// ─── Marketability scoring ────────────────────────────────────────────────────

const BASE_SCORES: Record<CommitType, number> = {
  feature: 0.7,
  fix: 0.4,
  perf: 0.5,
  unknown: 0.3,
  refactor: 0.1,
  docs: 0.1,
  chore: 0.0,
  test: 0.0,
};

export function scoreMarketability(message: string, type: CommitType): number {
  let score = BASE_SCORES[type];
  const lower = message.toLowerCase();

  // Boost for high-signal keywords
  for (const kw of HIGH_SIGNAL_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 0.08;
      break; // only one boost per commit
    }
  }

  // Penalty for low-signal keywords
  for (const kw of LOW_SIGNAL_KEYWORDS) {
    if (lower.includes(kw)) {
      score -= 0.15;
      break;
    }
  }

  // Small bonus for descriptive messages
  if (message.length > 50) score += 0.05;

  return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}

// ─── Keyword detection ────────────────────────────────────────────────────────

const DETECTABLE_KEYWORDS = [
  "payment",
  "stripe",
  "auth",
  "authentication",
  "analytics",
  "integration",
  "ai",
  "dashboard",
  "api",
  "search",
  "collaboration",
  "notification",
  "export",
  "performance",
  "onboarding",
  "billing",
  "subscription",
  "oauth",
  "webhook",
  "realtime",
  "mobile",
  "security",
  "encryption",
  "launch",
];

export function detectKeywords(message: string): string[] {
  const lower = message.toLowerCase();
  return DETECTABLE_KEYWORDS.filter((kw) => lower.includes(kw));
}

// ─── Full normalization ───────────────────────────────────────────────────────

interface RawCommitInput {
  sha: string;
  message: string;
  author: { name: string; email: string };
  committed_at?: string;
  repo: string;
  branch: string;
  source: string;
}

export function normalizeCommit(
  raw: RawCommitInput
): Omit<NormalizedCommit, "id"> {
  const type = detectCommitType(raw.message);
  const { title, body } = stripPrefix(raw.message);
  const score = scoreMarketability(raw.message, type);
  const keywords = detectKeywords(raw.message);
  const isMarketable = score >= 0.3;

  return {
    repo: raw.repo,
    sha: raw.sha,
    message: raw.message,
    title,
    body,
    author_name: raw.author.name,
    author_email: raw.author.email,
    committed_at: raw.committed_at ?? new Date().toISOString(),
    commit_type: type,
    is_marketable: isMarketable,
    marketing_score: score,
    detected_keywords: keywords,
    branch: raw.branch,
    source: raw.source,
  };
}
