import { BrandVoice, GenerateRequest } from "./types";
import type { AnnouncementObject } from "./announcement-builder";

const voiceInstructions: Record<BrandVoice, string> = {
  casual: `Write in a casual, authentic founder voice. Use contractions. Sound like a real person talking, not a brand. Short sentences. Direct. Personal. Use "I" not "we".`,
  professional: `Write in a polished, professional SaaS tone. Clear value proposition. Confident. Use "we" for the product. No slang. Business-appropriate but still human.`,
  developer: `Write in a developer-focused tone. Technical specifics are good. Honest about the build process. Use technical terms naturally. Fellow-engineer energy. Dry humor is fine.`,
};

const OUTPUT_SCHEMA = `{
  "tweet": "A single tweet under 280 characters. Punchy and specific. Include what was built and why it matters. End with a short call to action or open loop. No hashtags.",
  "thread": [
    "Tweet 1: Hook - the big claim or curiosity gap (under 280 chars)",
    "Tweet 2: The context - what problem this solves",
    "Tweet 3: What was actually built - specific details",
    "Tweet 4: One thing learned or surprised by",
    "Tweet 5: CTA - try it, follow for updates, reply with feedback"
  ],
  "linkedin": "A LinkedIn post. 150-250 words. Start with a bold first line (no 'I'm excited to announce'). Tell the story of building it. End with a question to drive comments. Use short paragraphs and line breaks for readability.",
  "reddit": "A Reddit post designed to feel like genuine community engagement, not marketing. Ask for feedback or opinions. Sound like a builder sharing honestly, not a founder pitching. 100-150 words. Works for r/SaaS or r/startups.",
  "indie_hackers": "An Indie Hackers style update. 100-150 words. Honest about the process. What you built, why, what you learned. Milestones and metrics if relevant. Feels like a real progress update not a press release.",
  "blog_draft": "A blog article draft. 500-700 words. Structure: opening hook paragraph (the problem or insight), then ## The Problem, ## What We Built (specific details), ## How It Works (brief technical), ## What This Means For You, closing CTA paragraph. Use markdown ## headers. Write in the founder's voice. Specific, not generic.",
  "email_subject": "Email subject line for announcing this update to subscribers. Under 50 chars. Curiosity-driven or direct value. No ALL CAPS.",
  "email_body": "Email newsletter update. 180-220 words. Warm opener. What was built and why it matters to them specifically. 2-3 concrete things they can now do. CTA with [LINK] placeholder. Brief P.S. with a behind-the-scenes detail.",
  "changelog_entry": "User-facing changelog entry. Under 80 words. Start with 'v[YYYY-MM-DD] —' then a one-line bold summary, then 3-4 bullets written from user perspective ('You can now...', 'Fixed an issue where...', 'Improved...'). No internal jargon."
}`;

const SHARED_RULES = `Rules:
- Never use phrases like "I'm excited to announce", "game-changing", "revolutionary", "thrilled to share"
- Sound human, not corporate
- Be specific about what was built — vague posts perform poorly
- Match the voice instructions exactly
- Each format should feel native to its platform`;

// ─── Raw update path (manual input from /new-update) ────────────────────────

export function buildGenerationPrompt(req: GenerateRequest): string {
  const examplesSection =
    req.examplePosts.length > 0
      ? `Here are examples of posts in my voice to match the style:\n${req.examplePosts.map((p, i) => `Example ${i + 1}:\n${p}`).join("\n\n")}`
      : "";

  return `You are a startup marketing assistant helping founders create authentic content from product updates.

Product: ${req.productName}
Description: ${req.productDescription}
Voice: ${voiceInstructions[req.brandVoice]}
${examplesSection}

The founder just shipped this update:
"${req.rawUpdate}"

Generate marketing content in exactly this JSON format. No markdown, no explanation, just the JSON object:

${OUTPUT_SCHEMA}

${SHARED_RULES}`;
}

// ─── Announcement object path (GitHub automation pipeline) ──────────────────

/**
 * Generates platform-specific content from a structured announcement object.
 * This is used when the pipeline has already extracted benefits + headline.
 * The output is higher quality because it has richer context.
 */
export function buildAnnouncementGenerationPrompt(
  announcement: AnnouncementObject,
  brandVoice: BrandVoice,
  examplePosts: string[] = []
): string {
  const benefits = announcement.benefits.map((b) => `• ${b}`).join("\n");

  const examplesSection =
    examplePosts.length > 0
      ? `Here are examples of posts in my voice to match the style:\n${examplePosts.map((p, i) => `Example ${i + 1}:\n${p}`).join("\n\n")}`
      : "";

  return `You are a startup marketing assistant creating platform-native content from a structured product announcement.

Voice: ${voiceInstructions[brandVoice]}
${examplesSection}

Announcement to work from:
─────────────────────────────
Product: ${announcement.product_name}
Feature: ${announcement.feature_name}
Headline: ${announcement.headline}
Summary: ${announcement.summary}

User benefits:
${benefits}

Why we built it: ${announcement.story}
Call to action: ${announcement.cta}${announcement.link ? ` → ${announcement.link}` : ""}
Audience: ${announcement.audience}
Tone: ${announcement.tone_hint}
Category: ${announcement.category}
─────────────────────────────

Generate marketing content using the announcement above as your source of truth.
Do NOT deviate from the benefits and summary — they have already been refined.
Generate ALL formats in exactly this JSON format. No markdown, no explanation, just the JSON:

${OUTPUT_SCHEMA}

Additional rules for announcement-based generation:
- The tweet MUST reference at least one concrete user benefit from the list above
- The thread opener MUST use a version of the headline as the hook
- LinkedIn MUST include the story context (why we built it)
- Blog draft MUST reference the product link if provided: ${announcement.link || "[LINK]"}
- Changelog entry MUST be dated with today's date
- Each platform version must feel platform-native (not copy-pasted)
${SHARED_RULES}`;
}

// ─── Release announcement prompt ─────────────────────────────────────────────

/**
 * For major version releases (v1.3.0 etc.) — generates a full marketing pack.
 * More comprehensive than a single feature announcement.
 */
export function buildReleaseAnnouncementPrompt(
  announcement: AnnouncementObject,
  releaseTag: string,
  allFeatures: string[],   // list of features in this release
  brandVoice: BrandVoice,
  examplePosts: string[] = []
): string {
  const featuresSection = allFeatures.length > 0
    ? `Features in this release:\n${allFeatures.map((f) => `• ${f}`).join("\n")}`
    : "";

  const examplesSection =
    examplePosts.length > 0
      ? `Voice examples:\n${examplePosts.map((p, i) => `Example ${i + 1}:\n${p}`).join("\n\n")}`
      : "";

  return `You are a startup marketing assistant creating a full launch marketing pack for a product release.

Voice: ${voiceInstructions[brandVoice]}
${examplesSection}

Release: ${releaseTag}
Product: ${announcement.product_name}
Headline: ${announcement.headline}
Summary: ${announcement.summary}

${featuresSection}

Key user benefits:
${announcement.benefits.map((b) => `• ${b}`).join("\n")}

${announcement.story ? `Story: ${announcement.story}` : ""}
CTA: ${announcement.cta}${announcement.link ? ` → ${announcement.link}` : ""}

This is a MAJOR release. Generate a full marketing pack:
- Tweet: Major milestone announcement, not just a feature. Max 280 chars.
- Thread: 6-tweet launch thread. Tweet 1 = big hook. Tweets 2-5 = one feature per tweet. Tweet 6 = CTA.
- LinkedIn: Full launch post. 200-300 words. Include what's new, who it's for, what's next.
- Reddit: r/SaaS style launch post. Honest, includes challenges overcome, asks for feedback.
- Indie Hackers: Milestone update. Metrics if available, what this release unlocks for users.
- Blog draft: Full launch post. 700-900 words. Include ## What's New (bullet list), ## The Bigger Picture, ## What's Next.
- Email subject + body: Launch announcement email to subscribers.
- Changelog entry: Comprehensive but readable. Include all major changes.

Return ONLY the JSON object (same format as always). No markdown wrapper.

${OUTPUT_SCHEMA}

${SHARED_RULES}`;
}
