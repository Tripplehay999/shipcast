import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const formatInstructions: Record<string, string> = {
  tweet:           "Rewrite this as a single tweet under 280 chars. Punchy, specific, ends with hook or CTA. No hashtags. Return only the tweet text.",
  thread:          "Rewrite this as a 5-tweet Twitter thread. Return each tweet on its own line separated by '---'. Tweet 1 is the hook, Tweet 5 is the CTA. Return only the tweets.",
  linkedin:        "Rewrite this as a LinkedIn post. 150-250 words. Bold first line, no 'I'm excited to'. Short paragraphs. Ends with a question. Return only the post.",
  reddit:          "Rewrite this as a Reddit post for r/SaaS or r/startups. Sounds like genuine community engagement, not marketing. 100-150 words. Return only the post.",
  indie_hackers:   "Rewrite this as an Indie Hackers update. 100-150 words. Honest, specific, builder-focused. Metrics if applicable. Return only the post.",
  blog_draft:      "Expand this into a blog article draft. 500-700 words. Use ## markdown headers. Structure: hook intro, ## The Problem, ## What We Built, ## How It Works, ## What This Means, closing CTA. Return only the article.",
  email_body:      "Rewrite this as an email newsletter update. Start with 'Subject: [subject line]' then a blank line then the body (180-220 words). Include [LINK] placeholder and a P.S. Return only the email.",
  changelog_entry: "Rewrite this as a user-facing changelog entry. Under 80 words. Start with 'v[YYYY-MM-DD] —', a bold summary line, then 3-4 user-facing bullets ('You can now...', 'Fixed...'). Return only the entry.",
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, sourceFormat, targetFormat } = await req.json() as {
      content: string; sourceFormat: string; targetFormat: string;
    };
    if (!content?.trim() || !targetFormat) {
      return NextResponse.json({ error: "Missing content or target format" }, { status: 400 });
    }

    const instruction = formatInstructions[targetFormat];
    if (!instruction) return NextResponse.json({ error: "Unsupported target format" }, { status: 400 });

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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are repurposing content for ${profile?.product_name ?? "a product"}.
Voice: ${voiceMap[profile?.brand_voice ?? "casual"]}.
Source format: ${sourceFormat}

${instruction}

Original content:
${content}`,
      }],
    });

    const result = message.content[0].type === "text" ? message.content[0].text.trim() : content;
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Repurpose failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
