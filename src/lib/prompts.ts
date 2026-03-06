import { BrandVoice, GenerateRequest } from "./types";

const voiceInstructions: Record<BrandVoice, string> = {
  casual: `Write in a casual, authentic founder voice. Use contractions. Sound like a real person talking, not a brand. Short sentences. Direct. Personal. Use "I" not "we".`,
  professional: `Write in a polished, professional SaaS tone. Clear value proposition. Confident. Use "we" for the product. No slang. Business-appropriate but still human.`,
  developer: `Write in a developer-focused tone. Technical specifics are good. Honest about the build process. Use technical terms naturally. Fellow-engineer energy. Dry humor is fine.`,
};

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

{
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
  "indie_hackers": "An Indie Hackers style update. 100-150 words. Honest about the process. What you built, why, what you learned. Milestones and metrics if relevant. Feels like a real progress update not a press release."
}

Rules:
- Never use phrases like "I'm excited to announce", "game-changing", "revolutionary", "thrilled to share"
- Sound human, not corporate
- Be specific about what was built — vague posts perform poorly
- Match the voice instructions exactly
- Each format should feel native to its platform`;
}
