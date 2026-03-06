import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { buildGenerationPrompt } from "@/lib/prompts";
import { GenerateResponse } from "@/lib/types";
import { extractJson } from "@/lib/parse-json";

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
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
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
    await supabaseAdmin.from("generated_content").insert({
      update_id: update.id,
      tweet: parsed.tweet,
      thread: parsed.thread,
      linkedin: parsed.linkedin,
      reddit: parsed.reddit,
      indie_hackers: parsed.indie_hackers,
    });

    return NextResponse.json({ content: parsed, updateId: update.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
