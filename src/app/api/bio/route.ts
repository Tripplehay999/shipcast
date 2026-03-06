import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { role, hook } = await req.json() as { role: string; hook: string };
    if (!role?.trim()) return NextResponse.json({ error: "Describe your role first." }, { status: 400 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("product_name, product_description, brand_voice")
      .eq("clerk_user_id", userId)
      .single();

    const voiceMap: Record<string, string> = {
      casual: "casual, direct, human — like a real person, not a corporate profile",
      professional: "polished and professional, confident, clear value prop",
      developer: "technical, honest, fellow-engineer energy",
    };
    const voice = voiceMap[profile?.brand_voice ?? "casual"];

    const prompt = `Generate optimized social media bios for a founder.

Product: ${profile?.product_name ?? ""}
Product description: ${profile?.product_description ?? ""}
Their role/who they are: ${role}
Key hook or differentiator: ${hook || "not specified"}
Voice: ${voice}

Generate bios in exactly this JSON format. No markdown, no explanation, just raw JSON:

{
  "twitter": "Twitter bio. Under 160 chars. 3 short lines. Line 1: what you build or do. Line 2: specific detail about the product or your background. Line 3: where to go or follow. No clichés like 'passionate' or 'guru'. Use \\n for line breaks.",
  "linkedin_headline": "LinkedIn headline. Under 120 chars. Format: [Role] at [Company] · [specific value prop or differentiator]. Not 'Founder | CEO | Entrepreneur'.",
  "linkedin_about": "LinkedIn About section. 150-180 words. First line must hook (bold claim or specific fact). Second paragraph: your backstory — why you built this. Third paragraph: what you're building now, who it's for. Fourth: what you're looking for (connections, customers, partners). End with a single CTA sentence. Short paragraphs.",
  "product_hunt": "Product Hunt profile bio. Under 200 chars. What you build, why, and a human detail. Conversational.",
  "github": "GitHub bio. Under 160 chars. Technical focus. What you build and with what stack or approach. Optional: current project. Dry wit welcome.",
  "indie_hackers": "Indie Hackers bio. Under 200 chars. Builder energy. What you're working on, what stage you're at, what you're interested in discussing."
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Failed to parse bio response");
    const bios = JSON.parse(match[0]);
    return NextResponse.json({ bios });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
