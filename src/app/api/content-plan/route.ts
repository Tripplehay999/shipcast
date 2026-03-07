import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { extractJson } from "@/lib/parse-json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const THEMES = {
  launch:      "This is a launch month. Heavy on product announcements, founder story, and driving sign-ups.",
  growth:      "This is a growth phase. Focus on value posts, user stories, feature highlights, and retention content.",
  community:   "This is a community-building phase. Focus on conversations, opinions, questions to the audience, and engagement.",
  thoughtleader: "This is a thought leadership phase. Mix product with insights, industry takes, lessons learned, and educational content.",
};

const POST_ROTATION = [
  { day: 1,  format: "linkedin",      topic: "founder story" },
  { day: 2,  format: "tweet",         topic: "problem this product solves" },
  { day: 3,  format: "thread",        topic: "feature deep-dive" },
  { day: 4,  format: "linkedin",      topic: "lesson learned while building" },
  { day: 5,  format: "reddit",        topic: "ask for feedback from community" },
  { day: 6,  format: "tweet",         topic: "contrarian take on the industry" },
  { day: 7,  format: "indie_hackers", topic: "weekly progress update with metrics" },
  { day: 8,  format: "thread",        topic: "how-to tutorial related to your product's problem space" },
  { day: 9,  format: "linkedin",      topic: "behind the scenes of building" },
  { day: 10, format: "tweet",         topic: "a tool or resource recommendation" },
  { day: 11, format: "linkedin",      topic: "a mistake you made and what you learned" },
  { day: 12, format: "thread",        topic: "case study or user success story" },
  { day: 13, format: "reddit",        topic: "share a resource or insight with the community" },
  { day: 14, format: "tweet",         topic: "a metric or milestone" },
  { day: 15, format: "blog_draft",    topic: "long-form article on core product problem" },
  { day: 16, format: "tweet",         topic: "opinion or prediction about your market" },
  { day: 17, format: "linkedin",      topic: "day-in-the-life of a founder" },
  { day: 18, format: "thread",        topic: "X things I wish I knew before building [product]" },
  { day: 19, format: "indie_hackers", topic: "honest update on what's working and what isn't" },
  { day: 20, format: "tweet",         topic: "reframe a common misconception in your space" },
  { day: 21, format: "reddit",        topic: "share progress and ask for specific advice" },
  { day: 22, format: "linkedin",      topic: "retrospective — what this month taught you" },
  { day: 23, format: "thread",        topic: "roadmap or what's coming next" },
  { day: 24, format: "tweet",         topic: "shoutout or collab" },
  { day: 25, format: "blog_draft",    topic: "deep dive on a technical or strategic decision" },
  { day: 26, format: "linkedin",      topic: "personal story that connects to your product mission" },
  { day: 27, format: "tweet",         topic: "product update or new feature teaser" },
  { day: 28, format: "indie_hackers", topic: "community question or AMA" },
  { day: 29, format: "thread",        topic: "comprehensive resource list for your audience" },
  { day: 30, format: "linkedin",      topic: "month wrap-up with key learnings and a CTA" },
];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { theme, startDate } = await req.json() as { theme: keyof typeof THEMES; startDate: string };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("product_name, product_description, brand_voice")
      .eq("clerk_user_id", userId)
      .single();

    const voiceMap: Record<string, string> = {
      casual: "casual, authentic founder — first person, contractions, direct, human",
      professional: "polished, professional SaaS — clear value props, confident, business-appropriate",
      developer: "developer-focused — technical specifics, honest, fellow-engineer energy",
    };

    const themeContext = THEMES[theme] ?? THEMES.growth;
    const voice = voiceMap[profile?.brand_voice ?? "casual"];

    const prompt = `You are generating a 30-day marketing content plan for a founder.

Product: ${profile?.product_name ?? "the product"}
Description: ${profile?.product_description ?? ""}
Voice: ${voice}
Theme: ${themeContext}

Generate a complete 30-day content plan. For each day, write a real draft of the post — not a placeholder, not a suggestion. An actual ready-to-publish post that sounds like the founder wrote it.

Return ONLY this JSON array, no markdown, no explanation:

[
  ${POST_ROTATION.map((d) => `{
    "day": ${d.day},
    "format": "${d.format}",
    "topic": "${d.topic}",
    "hook": "The opening line or hook of this post (1 sentence)",
    "draft": "The complete, ready-to-publish draft. Platform-appropriate length and style. For threads, separate tweets with ' --- '. For blog_draft, use ## markdown headers."
  }`).join(",\n  ")}
]

Rules:
- Every draft must be specific to ${profile?.product_name ?? "the product"} — not generic
- Match the voice throughout
- Make each post feel distinct — no two posts should sound the same
- Never use "I'm excited to announce" or "game-changing"`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error("Failed to parse content plan");

    // Sanitize literal newlines inside strings
    let sanitized = "";
    let inStr = false, escaped = false;
    for (const ch of arrMatch[0]) {
      if (escaped) { sanitized += ch; escaped = false; continue; }
      if (ch === "\\" && inStr) { escaped = true; sanitized += ch; continue; }
      if (ch === '"') { inStr = !inStr; sanitized += ch; continue; }
      if (inStr) {
        if (ch === "\n") { sanitized += "\\n"; continue; }
        if (ch === "\r") { sanitized += "\\r"; continue; }
        if (ch === "\t") { sanitized += "\\t"; continue; }
      }
      sanitized += ch;
    }

    const days = JSON.parse(sanitized);

    const { data: plan } = await supabaseAdmin
      .from("content_plans")
      .insert({
        clerk_user_id: userId,
        theme,
        start_date: startDate ?? new Date().toISOString().slice(0, 10),
        days,
      })
      .select("id")
      .single();

    return NextResponse.json({ plan: { id: plan?.id, days } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Content plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data } = await supabaseAdmin
        .from("content_plans")
        .select("*")
        .eq("id", id)
        .eq("clerk_user_id", userId)
        .single();
      return NextResponse.json({ plan: data });
    }

    const { data } = await supabaseAdmin
      .from("content_plans")
      .select("id, theme, start_date, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({ plans: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch plans";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
