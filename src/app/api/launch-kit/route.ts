import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { launchDescription, extraContext } = await req.json();
    if (!launchDescription?.trim()) {
      return NextResponse.json({ error: "Describe your launch first." }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("product_name, product_description, brand_voice")
      .eq("clerk_user_id", userId)
      .single();

    const voiceMap: Record<string, string> = {
      casual: "casual and direct — like a real founder talking to their community. Use 'I' not 'we'. Contractions. Short sentences. Human.",
      professional: "polished and professional. Clear value props. Confident. Use 'we' for the product. No slang. Business-appropriate but not robotic.",
      developer: "developer-focused. Technical specifics welcome. Honest about the build. Fellow-engineer energy. Dry wit is fine. Don't hide complexity.",
    };
    const voice = profile?.brand_voice ?? "casual";

    const prompt = `You are an elite startup launch strategist and copywriter. You've helped hundreds of founders launch on Product Hunt, Hacker News, and across social media. You write copy that actually converts — specific, human, and platform-native. No corporate speak, no fluff.

PRODUCT CONTEXT:
Product: ${profile?.product_name ?? "the product"}
Description: ${profile?.product_description ?? ""}
Brand voice: ${voiceMap[voice]}

WHAT THEY'RE LAUNCHING:
"${launchDescription}"

${extraContext ? `ADDITIONAL CONTEXT (pricing, dates, offers, anything else):\n"${extraContext}"` : ""}

Your job: Generate a complete, high-quality launch package. Every piece of copy must be:
- Specific (no generic filler, reference the actual product and what makes it different)
- Platform-native (each format should feel like it belongs there, not repurposed from another)
- Voice-matched (match the voice instructions above precisely)
- Ready to publish (no placeholders like [your name] — write it as if you are the founder)

Use [LINK] only for URLs that the founder needs to insert.

Output ONLY raw JSON matching this schema exactly — no markdown, no code fences, no explanation:

{
  "product_hunt": {
    "tagline": "One punchy line, under 60 characters. Describes what it does, not what it is. No buzzwords.",
    "description": "200-250 words for the Product Hunt listing description. Structure: (1) Open with the core frustration or problem — make it relatable in 2 sentences. (2) Introduce the product as the fix — what it does in plain English. (3) List 4-5 specific features using \\n• bullet format, each one showing a concrete benefit not just a feature name. (4) Close with who it's perfect for and a soft CTA to check it out. No hype words.",
    "first_comment": "120-150 words. The founder's first comment. Warm and personal. (1) Brief origin story — why did you actually build this? One specific frustration or moment. (2) What you're most proud of in this launch. (3) What kind of feedback you'd genuinely love. (4) Thank the Product Hunt community sincerely. Sign off with your first name."
  },
  "hacker_news": {
    "title": "Show HN title. Format: 'Show HN: [Product Name] – [what it does in plain technical English]'. Under 80 chars. No adjectives like 'amazing' or 'powerful'.",
    "post": "150-200 words. HN-style body. (1) One sentence on what it is. (2) The specific technical problem it solves — show you understand the domain deeply. (3) How it works under the hood — give engineers something interesting. (4) What's live today vs. what's coming. (5) A genuine question for the HN community. Write like you're posting from your own account, not marketing."
  },
  "press_release": {
    "headline": "Newswire headline. Factual and specific. Who did what. Under 100 chars. Example pattern: '[Company] Launches [Product] to Help [Audience] [Do Specific Thing]'",
    "subheadline": "One sentence expanding with the key differentiator or stat. Under 160 chars.",
    "body": "350-400 words. Full press release. Sections: (1) DATELINE + lede — cover the 5 Ws in the first paragraph. (2) Product description paragraph — what it does, how it's different. (3) Founder quote — direct quote, first-person, authentic, not corporate. Include a specific insight or belief about the market. (4) Feature/capability paragraph — 3 specific capabilities with concrete outcomes. (5) Availability and pricing. (6) About [Company] — 2 sentence boilerplate. (7) Media contact: [NAME], [EMAIL]. AP style throughout."
  },
  "email_announcement": {
    "subject": "Email subject line. Under 45 chars. Either a direct value statement or a curiosity hook. No all-caps, no excessive punctuation.",
    "preview_text": "Preview text shown in inbox. 90-110 chars. Complements the subject, adds context or intrigue.",
    "body": "250-300 words. (1) Personal opener — acknowledge who you're writing to, one sentence. (2) The announcement — what launched, explained like you're telling a friend over coffee. (3) Why this matters to them specifically — connect it to their world. (4) 3 specific things they can do with it right now — numbered list. (5) CTA: clear button-style text link [LINK]. (6) Honest P.S. — share a specific struggle or win from building this. Makes it feel real."
  },
  "social": {
    "launch_tweet": "Single launch-day tweet. Under 280 chars. (1) Open with the problem or an unexpected hook — not 'We launched'. (2) Name the product and what it does in one clause. (3) Drop [LINK]. Punchy. No hashtag spam — max 1 if truly relevant.",
    "launch_thread": [
      "Tweet 1 (hook): A bold claim, surprising stat, or specific frustration that makes someone stop scrolling. Under 280 chars. End with a line that makes them want to read on.",
      "Tweet 2 (problem): Paint the specific problem in vivid detail. Make the reader feel it. Not abstract — a real scenario.",
      "Tweet 3 (the old way): How people were solving this before. What was painful or slow or broken about it.",
      "Tweet 4 (the product): Introduce the product as the answer. One specific thing it does that changes the dynamic.",
      "Tweet 5 (feature 1): One killer feature. Not a feature name — a specific outcome. 'Instead of X, now you can Y.'",
      "Tweet 6 (feature 2): Another specific capability with a concrete before/after.",
      "Tweet 7 (traction or story): A real moment — first user, first paying customer, a specific piece of feedback you got, or a metric. Make it human.",
      "Tweet 8 (CTA): The ask. Link [LINK]. Reply ask. Clear action. Maybe a launch offer if relevant."
    ],
    "linkedin_post": "280-320 words. (1) Bold opening line that makes a professional stop scrolling — a contrarian take, a specific stat, or a direct statement about the problem. (2) 2-3 short paragraphs telling the real story — why you built it, what you discovered, what changed. (3) Bullet list of 4-5 specific capabilities (\\n• format), each written as an outcome not a feature name. (4) Who it's for — one sentence, specific. (5) Closing line with link [LINK]. Use short paragraphs and line breaks throughout.",
    "threads_post": "Under 500 chars. Conversational, direct. Lead with the most interesting part of the launch. State what it is. Drop the link [LINK]. Feels like a casual update to friends, not a press release."
  },
  "one_liners": {
    "elevator": "15 words max. For when someone asks 'what do you do?' — complete sentence, clear outcome.",
    "investor": "One sentence. States the market, the problem, and the solution. Shows you understand the business.",
    "technical": "One sentence with technical specificity. For developer audiences. Shows how it works or what's novel.",
    "benefit": "One sentence from the user's perspective. Outcome-focused. What their life looks like after using it.",
    "viral": "One sentence written to be shared. Provocative, surprising, or makes someone think 'hm, actually.'"
  },
  "image_prompts": {
    "og_image": "A detailed image generation prompt for the Open Graph / social share image (1200x628). Describe the visual style, what should be shown, color palette, typography placement.",
    "product_hunt_thumbnail": "A detailed prompt for the Product Hunt gallery thumbnail (240x240 or 480x480). Clean, readable at small size.",
    "twitter_header": "A detailed prompt for a Twitter/X profile header (1500x500). Brand-consistent, not cluttered.",
    "linkedin_banner": "A detailed prompt for a LinkedIn banner (1584x396). Professional yet distinctive."
  }
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse launch kit response");

    const kit = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ kit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Launch kit generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
