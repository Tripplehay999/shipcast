/**
 * Commit Grouper
 *
 * Groups related GitHub commits into single feature updates.
 * Prevents generating 5 separate marketing posts for one feature.
 *
 * Grouping rules:
 *  1. Commits must be within a 72-hour window
 *  2. Commits must share at least one feature keyword
 *  3. Or: commits must share a scope token (e.g. "feat(analytics):" and "fix(analytics):")
 *  4. Max group size: 20 commits
 */

import { classifyCommit, extractFeatureTitle, countCommitTypes, buildDeduplicationFingerprint } from "./feature-detector";
import type { CommitCategory } from "./feature-detector";

export interface RawCommit {
  id: string;
  message: string;
  commit_type?: string;
  committed_at: string;
  repo_full_name: string;
  clerk_user_id: string;
}

export interface CommitGroup {
  title: string;
  category: CommitCategory;
  commitIds: string[];
  primaryCommitId: string;
  detectedKeywords: string[];
  commitTypeCounts: Record<string, number>;
  signalScore: number;
  isMarketable: boolean;
  source: string;
  deduplicationFingerprint: string;
}

const GROUP_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
const MAX_GROUP_SIZE = 20;

// ─── Keyword extraction from commit message ─────────────────────────────────

const KEYWORD_PATTERNS = [
  /payment|billing|stripe|invoice|checkout/i,
  /analytics|dashboard|chart|report|metrics|stats/i,
  /auth|login|signup|oauth|session/i,
  /team|role|permission|share|invite|workspace/i,
  /automation|workflow|webhook|integration|sync/i,
  /email|sms|notification|alert/i,
  /search|filter|sort/i,
  /export|import|csv|pdf/i,
  /api|sdk|plugin|widget/i,
  /mobile|responsive|dark|theme/i,
  /onboard|wizard|setup/i,
  /cache|performance|speed|optimiz/i,
];

function extractKeywords(message: string): string[] {
  const found: string[] = [];
  for (const pat of KEYWORD_PATTERNS) {
    const match = message.match(pat);
    if (match) found.push(match[0].toLowerCase());
  }
  return [...new Set(found)];
}

function extractScope(message: string): string | null {
  const m = message.match(/^\w+\(([^)]+)\)!?:/);
  return m ? m[1].toLowerCase() : null;
}

function overlap(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  return b.some((x) => setA.has(x));
}

// ─── Main grouping function ──────────────────────────────────────────────────

export function groupCommits(commits: RawCommit[]): CommitGroup[] {
  if (commits.length === 0) return [];

  // Sort commits chronologically
  const sorted = [...commits].sort(
    (a, b) => new Date(a.committed_at).getTime() - new Date(b.committed_at).getTime()
  );

  // Build enriched commit objects
  const enriched = sorted.map((c) => ({
    ...c,
    signal: classifyCommit(c.message, c.commit_type),
    keywords: extractKeywords(c.message),
    scope: extractScope(c.message),
    ts: new Date(c.committed_at).getTime(),
  }));

  const groups: Array<{
    commits: typeof enriched;
    keywords: string[];
    scopes: string[];
    latestTs: number;
  }> = [];

  for (const commit of enriched) {
    // Skip pure noise
    if (commit.signal.score === 0 && commit.keywords.length === 0) continue;

    let placed = false;

    for (const group of groups) {
      if (group.commits.length >= MAX_GROUP_SIZE) continue;

      // Time window check
      const withinWindow = Math.abs(commit.ts - group.latestTs) <= GROUP_WINDOW_MS;
      if (!withinWindow) continue;

      // Keyword overlap check
      const keywordMatch = commit.keywords.length > 0 && overlap(commit.keywords, group.keywords);

      // Scope match check (e.g. both have (analytics))
      const scopeMatch =
        commit.scope !== null &&
        group.scopes.includes(commit.scope);

      if (keywordMatch || scopeMatch) {
        group.commits.push(commit);
        group.keywords = [...new Set([...group.keywords, ...commit.keywords])];
        if (commit.scope) group.scopes = [...new Set([...group.scopes, commit.scope])];
        group.latestTs = Math.max(group.latestTs, commit.ts);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({
        commits: [commit],
        keywords: commit.keywords,
        scopes: commit.scope ? [commit.scope] : [],
        latestTs: commit.ts,
      });
    }
  }

  // Build CommitGroup output objects
  return groups.map((group) => {
    const messages = group.commits.map((c) => c.message);
    const signals = group.commits.map((c) => c.signal);
    const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;

    // Primary commit = highest signal score
    const primaryCommit = group.commits.reduce((best, c) =>
      c.signal.score > classifyCommit(best.message).score ? c : best
    );

    const title = extractFeatureTitle(primaryCommit.message);
    const dominantCategory = signals
      .filter((s) => s.category !== "internal")
      .reduce(
        (acc, s) => {
          acc[s.category] = (acc[s.category] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    const category = (
      (Object.entries(dominantCategory).sort((a, b) => b[1] - a[1])[0]?.[0] as CommitCategory) ??
      "feature"
    );

    const allKeywords = [...new Set(group.commits.flatMap((c) => c.keywords))];

    return {
      title,
      category,
      commitIds: group.commits.map((c) => c.id),
      primaryCommitId: primaryCommit.id,
      detectedKeywords: allKeywords,
      commitTypeCounts: countCommitTypes(messages),
      signalScore: Math.round(avgScore * 1000) / 1000,
      isMarketable: avgScore >= 0.40,
      source: "github",
      deduplicationFingerprint: buildDeduplicationFingerprint(
        group.commits[0].clerk_user_id,
        allKeywords,
        group.commits[0].repo_full_name
      ),
    };
  });
}

// ─── Release grouping ────────────────────────────────────────────────────────

/**
 * For a GitHub release event, groups ALL commits since the previous release
 * into one high-signal release group.
 */
export function buildReleaseGroup(
  releaseCommits: RawCommit[],
  tagName: string,
  releaseName: string | null,
  clerkUserId: string,
  repoFullName: string
): CommitGroup {
  const allKeywords = [...new Set(releaseCommits.flatMap((c) => extractKeywords(c.message)))];
  const signals = releaseCommits.map((c) => classifyCommit(c.message, c.commit_type));
  const avgScore = signals.length > 0
    ? signals.reduce((sum, s) => sum + s.score, 0) / signals.length
    : 0.8;

  const primary = releaseCommits[0];

  return {
    title: releaseName ?? `Release ${tagName}`,
    category: "release",
    commitIds: releaseCommits.map((c) => c.id),
    primaryCommitId: primary?.id ?? "",
    detectedKeywords: allKeywords,
    commitTypeCounts: countCommitTypes(releaseCommits.map((c) => c.message)),
    signalScore: Math.max(0.8, avgScore),
    isMarketable: true,
    source: "release",
    deduplicationFingerprint: buildDeduplicationFingerprint(
      clerkUserId,
      [tagName, ...allKeywords],
      repoFullName
    ),
  };
}
