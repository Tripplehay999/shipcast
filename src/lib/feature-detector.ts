/**
 * Feature Detector
 *
 * Deterministic (no AI) signal classification for GitHub commits.
 * Decides whether a commit is worth marketing and what category it belongs to.
 */

export type CommitCategory =
  | "feature"
  | "improvement"
  | "integration"
  | "performance"
  | "bugfix"
  | "release"
  | "internal";

export interface CommitSignal {
  category: CommitCategory;
  score: number;        // 0.0 – 1.0  marketing signal strength
  isMarketable: boolean;
  keywords: string[];
  reason: string;
}

// ─── Commit type prefix → base score ───────────────────────────────────────

const TYPE_SCORES: Record<string, number> = {
  feat:        0.85,
  feature:     0.85,
  add:         0.70,
  new:         0.70,
  launch:      0.95,
  release:     0.95,
  integrate:   0.80,
  integration: 0.80,
  improve:     0.55,
  update:      0.45,
  enhance:     0.55,
  fix:         0.20,   // low unless user-facing keyword
  hotfix:      0.20,
  patch:       0.15,
  refactor:    0.05,
  chore:       0.00,
  style:       0.00,
  test:        0.00,
  tests:       0.00,
  ci:          0.00,
  build:       0.00,
  docs:        0.05,
  perf:        0.35,
  revert:      0.00,
  wip:         0.00,
  merge:       0.00,
};

// ─── User-facing feature keywords → score boost ────────────────────────────

const FEATURE_KEYWORDS: Array<{ pattern: RegExp; boost: number; category: CommitCategory }> = [
  // Payments & billing
  { pattern: /payment|stripe|billing|invoice|checkout|subscription|plan|pricing|revenue/i, boost: 0.30, category: "integration" },
  // Analytics & reporting
  { pattern: /analytics|dashboard|chart|graph|report|metrics|stats|tracking|insights/i, boost: 0.25, category: "feature" },
  // Auth & accounts
  { pattern: /oauth|sso|login|signup|auth|password|2fa|mfa|session|account/i, boost: 0.20, category: "feature" },
  // Collaboration & teams
  { pattern: /team|role|permission|share|collaborate|comment|mention|invite|workspace/i, boost: 0.25, category: "feature" },
  // Automation & workflow
  { pattern: /automation|workflow|trigger|schedule|cron|webhook|integration|sync/i, boost: 0.25, category: "integration" },
  // Communication
  { pattern: /email|sms|notification|alert|reminder|inbox/i, boost: 0.20, category: "feature" },
  // Search & navigation
  { pattern: /search|filter|sort|pagination|query/i, boost: 0.15, category: "improvement" },
  // Exports & imports
  { pattern: /export|import|csv|pdf|download|upload/i, boost: 0.20, category: "feature" },
  // API & integrations
  { pattern: /api|sdk|plugin|extension|embed|widget|zapier|slack|github/i, boost: 0.25, category: "integration" },
  // Performance (user-facing)
  { pattern: /speed|performance|fast|slow|optimiz|cache|latency/i, boost: 0.15, category: "performance" },
  // Mobile & UI
  { pattern: /mobile|responsive|dark mode|theme|ui|ux|redesign|layout/i, boost: 0.20, category: "improvement" },
  // Onboarding & setup
  { pattern: /onboard|setup|wizard|guide|tutorial|walkthrough/i, boost: 0.20, category: "improvement" },
];

// ─── Commit type → category override ───────────────────────────────────────

const TYPE_CATEGORY: Record<string, CommitCategory> = {
  feat:        "feature",
  feature:     "feature",
  launch:      "release",
  release:     "release",
  integrate:   "integration",
  integration: "integration",
  improve:     "improvement",
  enhance:     "improvement",
  perf:        "performance",
  fix:         "bugfix",
  hotfix:      "bugfix",
};

// ─── Noise patterns (definitely internal, never market) ────────────────────

const NOISE_PATTERNS = /\b(merge pull request|merge branch|dependabot|bump version|update dependencies|lint|eslint|prettier|whitespace|typo|comment|todo)\b/i;

// ─── Main classify function ─────────────────────────────────────────────────

export function classifyCommit(
  message: string,
  existingType?: string   // commit_type already parsed from DB
): CommitSignal {
  const lower = message.toLowerCase();

  // Hard filter: definite noise
  if (NOISE_PATTERNS.test(message)) {
    return { category: "internal", score: 0, isMarketable: false, keywords: [], reason: "noise pattern detected" };
  }

  // Parse conventional commit prefix: "feat(scope): title"
  const conventionalMatch = message.match(/^(\w+)(?:\([^)]+\))?!?:\s*(.+)/);
  const prefix = (conventionalMatch?.[1] ?? existingType ?? "").toLowerCase();
  const subject = conventionalMatch?.[2] ?? message;

  // Base score from prefix type
  let score = TYPE_SCORES[prefix] ?? 0.10;
  let category: CommitCategory = TYPE_CATEGORY[prefix] ?? "feature";

  // Score boost from feature keywords
  const matchedKeywords: string[] = [];
  for (const { pattern, boost, category: kCat } of FEATURE_KEYWORDS) {
    if (pattern.test(lower)) {
      const match = lower.match(pattern)?.[0];
      if (match) matchedKeywords.push(match);
      score = Math.min(1.0, score + boost);
      if (score > 0.5 && category === "feature") category = kCat;
    }
  }

  // "fix" + user-facing keyword → elevate to improvement
  if (prefix === "fix" && matchedKeywords.length > 0) {
    score = Math.min(1.0, score + 0.30);
    category = "improvement";
  }

  // Minimum length check (1-word commits are usually noise)
  if (subject.trim().split(/\s+/).length < 3) {
    score *= 0.5;
  }

  const isMarketable = score >= 0.45;
  const reason = isMarketable
    ? `${prefix || "unknown"} commit with ${matchedKeywords.length} feature signal(s)`
    : `low-signal ${prefix || "unknown"} commit`;

  return {
    category,
    score: Math.round(score * 1000) / 1000,
    isMarketable,
    keywords: matchedKeywords,
    reason,
  };
}

// ─── Group title extraction ─────────────────────────────────────────────────

/**
 * Extracts a clean feature title from a commit message.
 * "feat: add invoice analytics dashboard" → "Invoice Analytics Dashboard"
 */
export function extractFeatureTitle(message: string): string {
  // Strip conventional commit prefix
  const subject = message
    .replace(/^(\w+)(?:\([^)]+\))?!?:\s*/i, "")
    .replace(/^(add|implement|create|build|introduce|support)\s+/i, "")
    .trim();

  // Title case
  return subject
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 80);
}

// ─── Fingerprint for deduplication ─────────────────────────────────────────

/**
 * Creates a stable fingerprint from feature keywords for dedup detection.
 * Commits about the same feature should produce the same fingerprint.
 */
export function buildDeduplicationFingerprint(
  clerkUserId: string,
  keywords: string[],
  repoFullName: string
): string {
  const sorted = [...keywords].sort().join("|");
  const repo = repoFullName.split("/")[1] ?? repoFullName;
  return `${clerkUserId}:${repo}:${sorted}`.toLowerCase();
}

// ─── Commit type counting ───────────────────────────────────────────────────

export function countCommitTypes(messages: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const msg of messages) {
    const m = msg.match(/^(\w+)(?:\([^)]+\))?!?:/);
    const type = m?.[1]?.toLowerCase() ?? "other";
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

// ─── Should ignore a commit group? ─────────────────────────────────────────

export function isLowSignalGroup(
  signals: CommitSignal[],
  avgScore: number
): boolean {
  // All commits are internal
  if (signals.every((s) => !s.isMarketable)) return true;
  // Average score too low
  if (avgScore < 0.35) return true;
  // Only noise categories
  const nonNoise = signals.filter((s) => s.category !== "internal");
  if (nonNoise.length === 0) return true;
  return false;
}
