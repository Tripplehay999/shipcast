import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { buildGenerationPrompt } from "@/lib/prompts";
import { GenerateResponse } from "@/lib/types";
import { extractJson } from "@/lib/parse-json";
import { logAIUsage } from "@/lib/ai-logger";
import { scorePosts } from "@/lib/content-scorer";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { rawUpdate } = body;
    if (!rawUpdate?.trim()) {
      return NextResponse.json({ error: "Update text is required" }, { status: 400 });
    }
    if (rawUpdate.length > 5000) {
      return NextResponse.json({ error: "Update text too long (max 5000 characters)" }, { status: 400 });
    }

    // Fetch user profile for context
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const prompt = buildGenerationPrompt({
      rawUpdate,
      productName: profile?.product_name ?? "my product",
      productDescription: profile?.product_description ?? "",
      brandVoice: profile?.brand_voice ?? "casual",
      examplePosts: profile?.example_posts ?? [],
    });

    // Call Claude
    const t0 = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    });
    const durationMs = Date.now() - t0;

    // Log usage (non-blocking)
    logAIUsage({
      clerkUserId: userId,
      endpoint: "generate",
      model: "claude-sonnet-4-6",
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      durationMs,
      success: true,
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let parsed: GenerateResponse;
    const jsonStr = extractJson(responseText);
    if (!jsonStr) {
      return NextResponse.json({ error: "AI returned an unexpected format. Try again." }, { status: 500 });
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response. Try again." }, { status: 500 });
    }

    // UTM injection — only if profile has a product_link
    if (profile?.product_link && typeof profile.product_link === 'string') {
      const link = profile.product_link as string;
      const sep = link.includes('?') ? '&' : '?';
      const injectUtm = (text: string, platform: string): string => {
        if (!text || !text.includes(link)) return text;
        const utmUrl = `${link}${sep}utm_source=${platform}&utm_medium=social&utm_campaign=shipcast`;
        return text.split(link).join(utmUrl);
      };
      if (parsed.tweet)          parsed = { ...parsed, tweet:          injectUtm(parsed.tweet,          'twitter') };
      if (parsed.linkedin)       parsed = { ...parsed, linkedin:       injectUtm(parsed.linkedin,       'linkedin') };
      if (parsed.reddit)         parsed = { ...parsed, reddit:         injectUtm(parsed.reddit,         'reddit') };
      if (parsed.indie_hackers)  parsed = { ...parsed, indie_hackers:  injectUtm(parsed.indie_hackers,  'indie_hackers') };
    }

    // Save update to DB
    const { data: update, error: updateError } = await supabaseAdmin
      .from("updates")
      .insert({ clerk_user_id: userId, raw_update: rawUpdate })
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: `DB error: ${updateError.message}` }, { status: 500 });
    }

    // Save generated content
    const { data: savedContent } = await supabaseAdmin.from("generated_content").insert({
      update_id: update.id,
      tweet: parsed.tweet,
      thread: parsed.thread,
      linkedin: parsed.linkedin,
      reddit: parsed.reddit,
      indie_hackers: parsed.indie_hackers,
      blog_draft: parsed.blog_draft ?? null,
      email_subject: parsed.email_subject ?? null,
      email_body: parsed.email_body ?? null,
      changelog_entry: parsed.changelog_entry ?? null,
    }).select().single();

    // Score content in background (non-blocking — doesn't affect response time)
    if (savedContent) {
      const contentId = savedContent.id;
      const headline = rawUpdate.slice(0, 200);
      const postsToScore = [
        { format: "tweet", content: parsed.tweet },
        { format: "linkedin", content: parsed.linkedin },
        { format: "reddit", content: parsed.reddit },
        { format: "indie_hackers", content: parsed.indie_hackers },
      ].filter((p) => !!p.content) as { format: string; content: string }[];

      scorePosts(postsToScore, { headline, summary: headline, benefits: [] })
        .then(async (batch) => {
          if (batch.scores.length === 0) return;
          await supabaseAdmin.from("content_scores").insert(
            batch.scores.map((s) => ({
              generated_content_id: contentId,
              announcement_id: null,
              format: s.format,
              score: s.score,
              hook_strength: s.hook_strength,
              clarity: s.clarity,
              benefit_emphasis: s.benefit_emphasis,
              novelty: s.novelty,
              feedback: s.feedback,
              needs_regeneration: s.needs_regeneration,
            }))
          );
        })
        .catch(() => { /* scoring is best-effort */ });
    }

    return NextResponse.json({ content: parsed, updateId: update.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
