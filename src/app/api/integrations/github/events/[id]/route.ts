import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const ALLOWED_STATUSES = ["needs_review", "promoted", "dismissed"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
function isAllowedStatus(v: unknown): v is AllowedStatus {
  return ALLOWED_STATUSES.includes(v as AllowedStatus);
}

// PATCH — update status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));

  if (!isAllowedStatus(status)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("marketing_event_candidates")
    .update({ status })
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.code === "PGRST116" ? "Event not found" : error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  }

  return NextResponse.json({ event: data });
}

// POST — generate ready-to-post content from this event
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get the event + joined commit
  const { data: event } = await supabaseAdmin
    .from("marketing_event_candidates")
    .select("*, commit:github_commits(*)")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Get user profile for brand voice
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, product_description, brand_voice, example_posts")
    .eq("clerk_user_id", userId)
    .single();

  const productName = profile?.product_name ?? "our product";
  const brandVoice = profile?.brand_voice ?? "casual";
  const examplePosts = (profile?.example_posts ?? []) as string[];

  const commitMsg = event.commit?.message ?? event.short_summary;
  const audienceValue = event.audience_value ?? event.short_summary;
  const productArea = event.product_area ?? "";
  const eventType = event.event_type ?? "feature_release";

  const voiceGuide: Record<string, string> = {
    casual: "Conversational, direct, a bit excited. Like a founder talking to their community.",
    professional: "Polished and confident. Clear ROI focus. Like a VP of Product announcement.",
    developer: "Technical precision with just enough excitement. Code-friendly framing welcome.",
  };

  const examplesBlock = examplePosts.length > 0
    ? `\n\nHere are example posts from this founder to match their voice:\n${examplePosts.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join("\n")}`
    : "";

  const prompt = `You are a world-class startup marketing copywriter. Your job is to write a tweet announcement that sounds like it came directly from the founder — not from a marketing team.

Product: ${productName}
${profile?.product_description ? `What it does: ${profile.product_description}` : ""}
Brand voice: ${voiceGuide[brandVoice] ?? voiceGuide.casual}${examplesBlock}

A developer just shipped this commit:
"${commitMsg}"

Context:
- What changed: ${event.short_summary}
- User benefit: ${audienceValue}
${productArea ? `- Product area: ${productArea}` : ""}
- Type: ${eventType.replace(/_/g, " ")}

Write the tweet announcement. Rules:
- Under 280 characters (strictly)
- Sound like Anthropic, Vercel, or Linear would announce it — founder voice, not corporate speak
- Lead with what changed / what's now possible, not "excited to announce"
- Include 1–3 relevant hashtags at the end
- Do NOT use emojis unless the brand voice is casual
- No filler phrases like "game-changer" or "revolutionize"
- Make it feel real and specific — not generic

Also write a short LinkedIn version (2–3 sentences, more context, professional tone).

Return JSON only:
{
  "tweet": "the tweet text including hashtags",
  "linkedin": "the linkedin post text"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  let parsed: { tweet: string; linkedin: string };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }

  // Mark event as promoted
  await supabaseAdmin
    .from("marketing_event_candidates")
    .update({ status: "promoted" })
    .eq("id", id)
    .eq("clerk_user_id", userId);

  return NextResponse.json({ tweet: parsed.tweet, linkedin: parsed.linkedin });
}
