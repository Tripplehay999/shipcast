/**
 * Announcement Builder
 *
 * AI-powered: takes a commit group (or raw update) and produces
 * a structured AnnouncementObject before any platform content is generated.
 *
 * Pipeline position: commit_group → [this] → announcement_object → content generation
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "./parse-json";
import type { CommitCategory } from "./feature-detector";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnnouncementInput {
  // Source material
  commitMessages?: string[];    // raw commit messages (GitHub path)
  rawUpdate?: string;           // founder-written update (manual path)
  releaseTag?: string;          // e.g. "v1.3.0"
  releaseNotes?: string;        // GitHub release body

  // Product context (from profile)
  productName: string;
  productDescription: string;
  productLink?: string;
  audience?: string;            // "freelancers", "developers", "teams"
  brandVoice?: string;

  // Classification hints
  category?: CommitCategory;
  detectedKeywords?: string[];
}

export interface AnnouncementObject {
  product_name: string;
  feature_name: string;
  headline: string;
  summary: string;
  benefits: string[];
  story: string;
  cta: string;
  link: string;
  category: CommitCategory | "release";
  audience: string;
  tone_hint: string;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

function buildExtractionPrompt(input: AnnouncementInput): string {
  const sourceLines: string[] = [];

  if (input.releaseTag) {
    sourceLines.push(`Release: ${input.releaseTag}`);
  }
  if (input.releaseNotes) {
    sourceLines.push(`Release notes:\n${input.releaseNotes}`);
  }
  if (input.commitMessages?.length) {
    const relevant = input.commitMessages.slice(0, 20).join("\n");
    sourceLines.push(`Commit messages:\n${relevant}`);
  }
  if (input.rawUpdate) {
    sourceLines.push(`Founder update:\n${input.rawUpdate}`);
  }
  if (input.detectedKeywords?.length) {
    sourceLines.push(`Detected feature areas: ${input.detectedKeywords.join(", ")}`);
  }

  return `You are a product marketing expert who turns technical development activity into structured product announcements.

Product: ${input.productName}
Description: ${input.productDescription}
Target audience: ${input.audience ?? "founders and builders"}
Category: ${input.category ?? "feature"}
Brand voice: ${input.brandVoice ?? "casual"}

Development activity:
${sourceLines.join("\n\n")}

Extract a structured marketing announcement from this development activity. Focus on:
- What changed from the USER's perspective (not the engineer's)
- Concrete benefits the user gets
- Why this feature matters
- The human story behind building it

Return ONLY a JSON object in this exact format (no markdown, no extra text):

{
  "product_name": "${input.productName}",
  "feature_name": "Short feature name (2-4 words, e.g. 'Invoice Analytics')",
  "headline": "Introducing [Feature] for [Product] — one compelling line",
  "summary": "1-2 sentences explaining the feature from user perspective. What can they do now that they couldn't before?",
  "benefits": [
    "Benefit 1: specific, concrete, starts with action verb",
    "Benefit 2: specific, concrete, starts with action verb",
    "Benefit 3: specific, concrete, starts with action verb"
  ],
  "story": "1-2 sentences on why you built this. What pain were you solving? Keep it honest and human.",
  "cta": "2-3 word call to action (e.g. 'Try it now', 'See it live', 'Start free')",
  "link": "${input.productLink ?? ""}",
  "category": "${input.category ?? "feature"}",
  "audience": "who this helps most (e.g. 'freelancers', 'developers', 'teams')",
  "tone_hint": "one adjective for the vibe of this launch (e.g. 'exciting', 'practical', 'technical', 'milestone')"
}

Rules:
- Never use: "game-changing", "revolutionary", "excited to announce", "thrilled", "proud to share"
- Benefits must start with action verbs: "Track", "Send", "Automate", "View", etc.
- Summary must be from the USER's perspective, not the developer's
- If commits are low-signal internal work, still find the best user-facing angle
- story should feel authentic, not like a press release`;
}

// ─── Main function ───────────────────────────────────────────────────────────

export async function buildAnnouncement(
  input: AnnouncementInput
): Promise<{ announcement: AnnouncementObject; inputTokens: number; outputTokens: number; durationMs: number }> {
  const prompt = buildExtractionPrompt(input);

  const t0 = Date.now();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });
  const durationMs = Date.now() - t0;

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("Announcement builder: AI returned non-JSON response");

  const parsed = JSON.parse(jsonStr) as AnnouncementObject;

  // Ensure benefits array is populated
  if (!parsed.benefits || parsed.benefits.length === 0) {
    parsed.benefits = ["Use the new feature immediately"];
  }

  // Clamp benefits to 5 max
  parsed.benefits = parsed.benefits.slice(0, 5);

  return {
    announcement: parsed,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs,
  };
}

// ─── Dedup hash ──────────────────────────────────────────────────────────────

/**
 * Builds a semantic hash for announcement deduplication.
 * Two announcements about the same feature get the same hash.
 */
export function buildAnnouncementHash(
  clerkUserId: string,
  featureName: string,
  category: string
): string {
  const normalized = featureName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .sort()
    .join("-");
  return `${clerkUserId}:${category}:${normalized}`;
}
