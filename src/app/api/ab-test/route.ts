import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const instructions: Record<string, string> = {
  tweet: `Generate 2 alternative versions of this tweet with different hooks and angles. Keep each under 280 chars.
Version A: Lead with a surprising statistic or bold claim.
Version B: Lead with a relatable problem or pain point.
Do NOT reuse the original hook.`,
  linkedin: `Generate 2 alternative versions of this LinkedIn post with different opening strategies.
Version A: Open with a counterintuitive insight or hot take.
Version B: Open with a short personal story or specific moment.
Keep the same core message but completely different opening.`,
  thread: `Generate 2 alternative first tweets for this thread with different hooks.
Version A: Open with a shocking number or bold promise ("I did X and got Y").
Version B: Open with a problem statement ("Most [audience] don't realize...").
Return only the opening tweet for each version, not the full thread.`,
  reddit: `Generate 2 alternative titles/openings for this Reddit post with different angles.
Version A: Frame it as a question or discussion starter.
Version B: Frame it as a story or personal experience.`,
  indie_hackers: `Generate 2 alternative openings for this Indie Hackers update.
Version A: Lead with a specific metric or milestone number.
Version B: Lead with the biggest lesson or insight from this update.`,
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, platform } = await req.json().catch(() => ({})) as { content?: string; platform?: string };
  if (!content?.trim() || !platform) {
    return NextResponse.json({ error: "content and platform required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, brand_voice")
    .eq("clerk_user_id", userId)
    .single();

  const voiceMap: Record<string, string> = {
    casual: "casual, authentic founder voice",
    professional: "polished, professional SaaS tone",
    developer: "developer-focused, technical and direct",
  };
  const voice = voiceMap[profile?.brand_voice ?? "casual"];
  const instruction = instructions[platform] ?? instructions.tweet;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `You are writing A/B test variants for ${profile?.product_name ?? "a product"}. Voice: ${voice}.

${instruction}

Original content:
${content}

Return JSON only:
{
  "variantA": "first alternative version",
  "variantB": "second alternative version",
  "hookA": "3-word label for A's hook type",
  "hookB": "3-word label for B's hook type"
}`,
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  try {
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
