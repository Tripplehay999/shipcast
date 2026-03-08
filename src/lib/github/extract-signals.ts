import type { NormalizedCommit, MarketingEventCandidate, EventType } from "./types";

// ─── Product area detection ───────────────────────────────────────────────────

const PRODUCT_AREA_MAP: Array<[string[], string]> = [
  [["payment", "stripe", "billing", "subscription", "invoice"], "payments"],
  [["auth", "authentication", "oauth", "login", "signup", "sign-in", "sign-up", "password"], "auth"],
  [["analytics", "metrics", "tracking", "event", "stats"], "analytics"],
  [["notification", "alert", "email", "sms", "push"], "notifications"],
  [["api", "endpoint", "webhook", "rest", "graphql"], "api"],
  [["search", "filter", "query", "index"], "search"],
  [["collaboration", "team", "share", "invite", "member"], "collaboration"],
  [["ai", "llm", "gpt", "claude", "model", "inference", "embedding"], "ai"],
  [["performance", "speed", "latency", "cache", "optimize", "faster"], "performance"],
  [["onboarding", "tutorial", "guide", "wizard", "setup"], "onboarding"],
  [["export", "import", "download", "upload", "csv", "pdf"], "export"],
  [["mobile", "ios", "android", "responsive"], "mobile"],
  [["security", "encryption", "vulnerability", "cve", "rbac", "permission"], "security"],
  [["dashboard", "chart", "graph", "report", "visualization"], "dashboard"],
];

function detectProductArea(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [keywords, area] of PRODUCT_AREA_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return area;
  }
  return null;
}

// ─── Event type detection ─────────────────────────────────────────────────────

function detectEventType(
  commitType: NormalizedCommit["commit_type"],
  message: string,
  productArea: string | null
): EventType {
  const lower = message.toLowerCase();

  if (productArea === "security") return "security";
  if (productArea === "analytics") return "analytics";
  if (productArea === "api") return "api_change";
  if (productArea === "performance") return "performance";

  if (commitType === "feature") {
    if (productArea === "payments") return "integration";
    if (productArea === "auth") return "integration";
    if (lower.includes("integration") || lower.includes("connect")) return "integration";
    if (lower.includes("dashboard") || lower.includes("ui") || lower.includes("ux")) return "ux_improvement";
    return "feature_release";
  }

  if (commitType === "fix") return "bug_fix";
  if (commitType === "perf") return "performance";
  if (commitType === "refactor") return "infrastructure";
  if (commitType === "chore") return "infrastructure";

  return "other";
}

// ─── Audience value generation ────────────────────────────────────────────────

function generateAudienceValue(
  eventType: EventType,
  productArea: string | null,
  title: string
): string {
  const areaLabel = productArea ?? "core functionality";

  switch (eventType) {
    case "feature_release":
      return `Users can now ${title.toLowerCase().replace(/^(add|implement|create|build|introduce)\s+/i, "use ")}`;
    case "bug_fix":
      return `Resolved issue with ${areaLabel} — improved reliability`;
    case "performance":
      return `${areaLabel.charAt(0).toUpperCase() + areaLabel.slice(1)} is now faster and more efficient`;
    case "integration":
      return `Seamless ${areaLabel} integration — connect and get more done`;
    case "analytics":
      return `Better insights into ${areaLabel} usage and behavior`;
    case "security":
      return `Enhanced security for ${areaLabel} — your data stays safer`;
    case "ux_improvement":
      return `Improved ${areaLabel} experience — easier to use`;
    case "api_change":
      return `Updated ${areaLabel} API — more powerful developer access`;
    case "infrastructure":
      return `More stable and reliable ${areaLabel}`;
    default:
      return `Improvements to ${areaLabel}`;
  }
}

// ─── Audience targeting ───────────────────────────────────────────────────────

function generateLikelyAudience(
  eventType: EventType,
  productArea: string | null
): string {
  if (productArea === "api" || eventType === "api_change") return "developers";
  if (productArea === "security") return "enterprise customers, security-conscious users";
  if (productArea === "payments") return "paying customers, finance teams";
  if (productArea === "analytics") return "power users, growth teams";
  if (productArea === "collaboration") return "team leads, enterprise users";
  if (productArea === "ai") return "tech-savvy users, early adopters";
  if (eventType === "bug_fix") return "existing users affected by the bug";
  if (eventType === "feature_release") return "all users, potential customers";
  if (eventType === "performance") return "all users";
  return "all users";
}

// ─── Main signal extractor ────────────────────────────────────────────────────

export function extractMarketingSignal(
  commit: NormalizedCommit & { id: string },
  clerkUserId: string
): Omit<MarketingEventCandidate, "id"> {
  const productArea = detectProductArea(commit.message);
  const eventType = detectEventType(commit.commit_type, commit.message, productArea);
  const audienceValue = generateAudienceValue(eventType, productArea, commit.title);
  const likelyAudience = generateLikelyAudience(eventType, productArea);
  const launchWorthy = commit.marketing_score >= 0.6 && commit.is_marketable;
  const confidence = parseFloat(
    Math.min(0.95, commit.marketing_score + (productArea ? 0.1 : 0)).toFixed(2)
  );

  return {
    clerk_user_id: clerkUserId,
    commit_id: commit.id,
    repo_full_name: commit.repo,
    event_type: eventType,
    short_summary: commit.title,
    product_area: productArea,
    audience_value: audienceValue,
    likely_audience: likelyAudience,
    launch_worthy: launchWorthy,
    confidence,
    status: "needs_review",
  };
}
