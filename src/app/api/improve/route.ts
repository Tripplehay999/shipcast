import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const platformInstructions: Record<string, string> = {
  tweet: "Improve this tweet. Keep it under 280 chars. Make the hook stronger, cut any filler words, make it more specific. Return only the improved tweet text, nothing else.",
  thread: "Improve this Twitter thread. Make each tweet punchier. Strengthen the hook (tweet 1). Ensure each tweet flows into the next. Return the improved tweets separated by '---' on their own line, nothing else.",
  linkedin: "Improve this LinkedIn post. Strengthen the opening line (no 'I'm excited to'). Make the story more compelling. Improve readability with better paragraph breaks. End with a stronger CTA. Return only the improved post, nothing else.",
  reddit: "Improve this Reddit post. Make it sound more like genuine community engagement. Less promotional, more honest and direct. Return only the improved post text, nothing else.",
  indie_hackers: "Improve this Indie Hackers update. Make it more authentic and specific. Include more detail about process, learnings, or metrics if possible. Return only the improved update, nothing else.",
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, platform } = await req.json() as { content: string; platform: string };
    if (!content?.trim() || !platform) {
      return NextResponse.json({ error: "Missing content or platform" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("product_name, brand_voice")
      .eq("clerk_user_id", userId)
      .single();

    const voiceMap: Record<string, string> = {
      casual: "casual, authentic founder voice",
      professional: "polished, professional SaaS tone",
      developer: "developer-focused, technical and honest",
    };
    const voice = voiceMap[profile?.brand_voice ?? "casual"];
    const instruction = platformInstructions[platform] ?? "Improve this content. Return only the improved text.";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are improving marketing copy for ${profile?.product_name ?? "a product"}. Voice: ${voice}.\n\n${instruction}\n\nContent to improve:\n${content}`,
      }],
    });

    const improved = message.content[0].type === "text" ? message.content[0].text.trim() : content;
    return NextResponse.json({ improved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Improve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
