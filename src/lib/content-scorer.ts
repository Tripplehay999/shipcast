/**
 * Content Scorer
 *
 * AI-powered: evaluates generated marketing content on 4 dimensions.
 * Low-scoring posts are flagged for regeneration.
 *
 * Scoring rubric (25 points each = 100 max):
 *   hook_strength    — Does the opening line grab attention?
 *   clarity          — Is the value proposition immediately clear?
 *   benefit_emphasis — Are user benefits prominent, not features?
 *   novelty          — Avoids clichés and generic phrases?
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "./parse-json";
import type { AnnouncementObject } from "./announcement-builder";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ContentScoreResult {
  format: string;
  score: number;           // 0–100 total
  hook_strength: number;   // 0–25
  clarity: number;         // 0–25
  benefit_emphasis: number; // 0–25
  novelty: number;         // 0–25
  feedback: string;        // one-sentence improvement suggestion
  needs_regeneration: boolean; // true if score < 60
}

export interface ScoreBatch {
  scores: ContentScoreResult[];
  bestFormat: string;
  bestScore: number;
  avgScore: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

type FormatContent = { format: string; content: string };

// ─── Prompt ─────────────────────────────────────────────────────────────────

function buildScoringPrompt(
  posts: FormatContent[],
  announcement: Pick<AnnouncementObject, "headline" | "summary" | "benefits">
): string {
  const postsSection = posts
    .map(({ format, content }) => {
      const preview = typeof content === "string"
        ? content.slice(0, 500)
        : JSON.stringify(content).slice(0, 500);
      return `FORMAT: ${format}\n---\n${preview}\n---`;
    })
    .join("\n\n");

  return `You are a marketing content quality evaluator. Score each post on 4 dimensions (0–25 each = 100 max).

The announcement context:
Headline: ${announcement.headline}
Summary: ${announcement.summary}
Key benefits: ${announcement.benefits.slice(0, 3).join("; ")}

Posts to evaluate:
${postsSection}

Score each post using this rubric:
- hook_strength (0-25): Does the first line immediately grab attention? Boring openers = low score. "I'm excited to announce" = 0.
- clarity (0-25): Is the value prop clear within 10 seconds? Vague language = low score.
- benefit_emphasis (0-25): Are user benefits front and center? Feature-first (not benefit-first) = low score.
- novelty (0-25): Avoids clichés like "game-changing", "revolutionary", "proud to share"? Fresh language = high score.

Return ONLY a JSON array (no markdown, no explanation):

[
  {
    "format": "tweet",
    "score": 82,
    "hook_strength": 22,
    "clarity": 20,
    "benefit_emphasis": 21,
    "novelty": 19,
    "feedback": "Strong hook but lead with the user benefit earlier"
  }
]

Include one entry per format. "feedback" must be a single actionable sentence.`;
}

// ─── Batch scorer ────────────────────────────────────────────────────────────

export async function scorePosts(
  posts: FormatContent[],
  announcement: Pick<AnnouncementObject, "headline" | "summary" | "benefits">
): Promise<ScoreBatch> {
  if (posts.length === 0) {
    return { scores: [], bestFormat: "", bestScore: 0, avgScore: 0, inputTokens: 0, outputTokens: 0, durationMs: 0 };
  }

  const prompt = buildScoringPrompt(posts, announcement);

  const t0 = Date.now();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });
  const durationMs = Date.now() - t0;

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  const jsonStr = extractJson(text) ?? "[]";

  let rawScores: Array<{
    format: string;
    score: number;
    hook_strength: number;
    clarity: number;
    benefit_emphasis: number;
    novelty: number;
    feedback: string;
  }> = [];

  try {
    rawScores = JSON.parse(jsonStr);
  } catch {
    // Return zero scores on parse failure
    rawScores = posts.map((p) => ({
      format: p.format,
      score: 0,
      hook_strength: 0,
      clarity: 0,
      benefit_emphasis: 0,
      novelty: 0,
      feedback: "Scoring failed — please review manually",
    }));
  }

  const scores: ContentScoreResult[] = rawScores.map((r) => ({
    ...r,
    score: Math.min(100, Math.max(0, r.score ?? 0)),
    hook_strength: Math.min(25, Math.max(0, r.hook_strength ?? 0)),
    clarity: Math.min(25, Math.max(0, r.clarity ?? 0)),
    benefit_emphasis: Math.min(25, Math.max(0, r.benefit_emphasis ?? 0)),
    novelty: Math.min(25, Math.max(0, r.novelty ?? 0)),
    needs_regeneration: (r.score ?? 0) < 60,
  }));

  const best = scores.reduce((a, b) => (b.score > a.score ? b : a), scores[0]);
  const avg = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return {
    scores,
    bestFormat: best?.format ?? "",
    bestScore: best?.score ?? 0,
    avgScore: avg,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs,
  };
}

// ─── Single format scorer (lightweight) ─────────────────────────────────────

export async function scorePost(
  format: string,
  content: string,
  announcement: Pick<AnnouncementObject, "headline" | "summary" | "benefits">
): Promise<ContentScoreResult> {
  const batch = await scorePosts([{ format, content }], announcement);
  return batch.scores[0] ?? {
    format,
    score: 0,
    hook_strength: 0,
    clarity: 0,
    benefit_emphasis: 0,
    novelty: 0,
    feedback: "Score unavailable",
    needs_regeneration: true,
  };
}
