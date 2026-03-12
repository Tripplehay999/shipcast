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

// POST — generate content and auto-queue it
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { postType = "quick" } = await req.json().catch(() => ({})) as { postType?: "quick" | "blog" };

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
  const productDesc = profile?.product_description ?? "";
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
    ? `\n\nExample posts from this founder:\n${examplePosts.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join("\n")}`
    : "";

  const context = `Product: ${productName}
${productDesc ? `What it does: ${productDesc}` : ""}
Brand voice: ${voiceGuide[brandVoice] ?? voiceGuide.casual}${examplesBlock}

Commit shipped: "${commitMsg}"
What changed: ${event.short_summary}
User benefit: ${audienceValue}
${productArea ? `Product area: ${productArea}` : ""}
Type: ${eventType.replace(/_/g, " ")}`;

  const prompt = postType === "blog"
    ? `You are a world-class startup content writer. Write a founder blog post about this shipped feature — the kind of in-depth update you'd publish on a company blog or Substack.

${context}

Rules:
- 350–550 words
- Founder voice — personal, direct, explains the "why" behind the decision, not just "what"
- Structure: hook (1 sentence) → what we shipped → why we built it → how it works (briefly) → what it means for users → closing CTA
- No bullet-point lists — flowing prose
- No emojis
- No corporate speak ("exciting", "thrilled", "game-changer")
- End with a clear CTA (try it, share it, reply with feedback)

Also write a LinkedIn version (3–4 sentences, professional but personal) and a tweet (under 280 chars, 1–2 hashtags).

Return JSON only:
{
  "blog": "the full blog post text",
  "linkedin": "the linkedin post",
  "tweet": "the tweet"
}`
    : `You are a world-class startup marketing copywriter. Write a tweet announcement that sounds like it came directly from the founder.

${context}

Rules:
- Tweet: under 280 characters (strictly), founder voice, lead with what changed, 1–3 hashtags, no emojis unless voice is casual, no filler phrases
- LinkedIn: 2–3 sentences, more context, professional tone

Return JSON only:
{
  "tweet": "the tweet text including hashtags",
  "linkedin": "the linkedin post text"
}`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: postType === "blog" ? 1200 : 800,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Anthropic API error";
    console.error("[events/generate] Anthropic error:", msg);
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 });
  }

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Generation failed: no JSON in response" }, { status: 500 });

  let parsed: { tweet?: string; linkedin?: string; blog?: string };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "Generation failed: could not parse response" }, { status: 500 });
  }

  // Save to updates + generated_content so it appears in History
  const rawUpdate = event.commit?.title || event.short_summary || commitMsg;
  const { data: update } = await supabaseAdmin
    .from("updates")
    .insert({ clerk_user_id: userId, raw_update: rawUpdate })
    .select()
    .single();

  if (update) {
    await supabaseAdmin.from("generated_content").insert({
      update_id: update.id,
      tweet: parsed.tweet ?? "",
      thread: [],
      linkedin: parsed.linkedin ?? "",
      reddit: "",
      indie_hackers: "",
      blog_draft: parsed.blog ?? null,
    });
  }

  // Auto-queue to Post Queue (tomorrow 9am)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const scheduledAt = tomorrow.toISOString();

  const postsToQueue: { platform: string; content: string }[] = [];
  if (parsed.tweet) postsToQueue.push({ platform: "twitter", content: parsed.tweet });
  if (parsed.linkedin) postsToQueue.push({ platform: "linkedin", content: parsed.linkedin });
  if (parsed.blog) postsToQueue.push({ platform: "linkedin", content: parsed.blog });

  if (postsToQueue.length > 0) {
    await supabaseAdmin.from("scheduled_posts").insert(
      postsToQueue.map((p) => ({
        clerk_user_id: userId,
        platform: p.platform,
        content: p.content,
        scheduled_at: scheduledAt,
        status: "pending",
      }))
    );
  }

  // Mark event as promoted
  await supabaseAdmin
    .from("marketing_event_candidates")
    .update({ status: "promoted" })
    .eq("id", id)
    .eq("clerk_user_id", userId);

  return NextResponse.json({
    tweet: parsed.tweet ?? null,
    linkedin: parsed.linkedin ?? null,
    blog: parsed.blog ?? null,
    queued: true,
    scheduledAt,
  });
}
