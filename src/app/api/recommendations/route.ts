import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url: inputUrl } = await req.json().catch(() => ({})) as { url?: string };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, product_description, brand_voice, product_link")
    .eq("clerk_user_id", userId)
    .single();

  const targetUrl = inputUrl?.trim() || (profile?.product_link as string | null) || null;
  if (!targetUrl) {
    return NextResponse.json({ error: "No URL provided. Add your product URL in Settings first." }, { status: 400 });
  }

  // Fetch webpage
  let pageText = "";
  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Shipcast/1.0 (marketing analysis)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return NextResponse.json({ error: "Could not fetch that URL. Check the address and try again." }, { status: 400 });
  }

  const productContext = profile?.product_name
    ? `Product: ${profile.product_name}\nDescription: ${profile.product_description ?? ""}\nVoice: ${profile.brand_voice ?? "casual"}`
    : "";

  const prompt = `You are a world-class startup marketing strategist. Analyze this product's website and generate a detailed, actionable marketing action plan.

URL: ${targetUrl}
${productContext}

Website content:
${pageText}

Generate a comprehensive marketing action plan. Be specific — reference the actual product content. No generic advice.

Return ONLY valid JSON in this exact structure:
{
  "productName": "detected product name",
  "oneLiner": "a sharper one-liner positioning statement you would write for them",
  "positioning": {
    "currentMessaging": "what their homepage currently says/implies",
    "weakness": "the #1 messaging problem you see",
    "fix": "the exact fix — what they should say instead",
    "taglines": ["tagline option 1", "tagline option 2", "tagline option 3"]
  },
  "audience": {
    "primary": "primary target audience (specific)",
    "secondary": "secondary audience",
    "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
    "whereToFind": "where this audience hangs out online"
  },
  "quickWins": [
    { "action": "specific action to take", "why": "why this will work", "effort": "low" },
    { "action": "specific action to take", "why": "why this will work", "effort": "low" },
    { "action": "specific action to take", "why": "why this will work", "effort": "medium" },
    { "action": "specific action to take", "why": "why this will work", "effort": "medium" },
    { "action": "specific action to take", "why": "why this will work", "effort": "high" }
  ],
  "platforms": {
    "twitter": {
      "strategy": "1-2 sentence platform strategy",
      "bestFormat": "thread | tweet | poll",
      "hooks": ["hook idea 1", "hook idea 2", "hook idea 3"],
      "postIdeas": ["specific post idea 1", "specific post idea 2", "specific post idea 3"]
    },
    "linkedin": {
      "strategy": "1-2 sentence platform strategy",
      "bestFormat": "story | list | insight",
      "hooks": ["hook idea 1", "hook idea 2", "hook idea 3"],
      "postIdeas": ["specific post idea 1", "specific post idea 2", "specific post idea 3"]
    },
    "reddit": {
      "strategy": "1-2 sentence platform strategy",
      "communities": ["r/community1", "r/community2", "r/community3"],
      "postIdeas": ["specific post idea 1", "specific post idea 2", "specific post idea 3"]
    },
    "productHunt": {
      "launchAdvice": "specific advice for a PH launch",
      "tagline": "suggested PH tagline",
      "firstComment": "what to write as the maker comment"
    }
  },
  "contentAngles": [
    { "angle": "angle name", "description": "what to write about", "example": "example post opening line" },
    { "angle": "angle name", "description": "what to write about", "example": "example post opening line" },
    { "angle": "angle name", "description": "what to write about", "example": "example post opening line" },
    { "angle": "angle name", "description": "what to write about", "example": "example post opening line" },
    { "angle": "angle name", "description": "what to write about", "example": "example post opening line" }
  ],
  "campaignIdeas": [
    { "name": "campaign name", "description": "what the campaign does", "platforms": ["twitter", "linkedin"], "duration": "1 week" },
    { "name": "campaign name", "description": "what the campaign does", "platforms": ["reddit"], "duration": "ongoing" },
    { "name": "campaign name", "description": "what the campaign does", "platforms": ["twitter", "linkedin", "reddit"], "duration": "launch week" }
  ],
  "seoOpportunities": ["keyword opportunity 1", "keyword opportunity 2", "keyword opportunity 3"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Analysis failed — try again." }, { status: 500 });

    const data = JSON.parse(match[0]);
    return NextResponse.json({ ...data, analyzedUrl: targetUrl });
  } catch {
    return NextResponse.json({ error: "Analysis failed — try again." }, { status: 500 });
  }
}
