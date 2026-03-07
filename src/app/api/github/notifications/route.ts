import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt } from "@/lib/prompts";
import { extractJson } from "@/lib/parse-json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// GET — fetch pending notifications
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("github_notifications")
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return NextResponse.json({ notifications: data ?? [] });
}

// POST — generate post from a notification and add to queue
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await req.json();
  if (!notificationId) return NextResponse.json({ error: "notificationId required" }, { status: 400 });

  const { data: notif } = await supabaseAdmin
    .from("github_notifications")
    .select("*")
    .eq("id", notificationId)
    .eq("clerk_user_id", userId)
    .single();

  if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  const prompt = buildGenerationPrompt({
    rawUpdate: notif.summary,
    productName: profile?.product_name ?? "the product",
    productDescription: profile?.product_description ?? "",
    brandVoice: profile?.brand_voice ?? "casual",
    examplePosts: profile?.example_posts ?? [],
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = extractJson(text);
  if (!jsonStr) return NextResponse.json({ error: "AI parse failed" }, { status: 500 });

  const parsed = JSON.parse(jsonStr);

  // Add tweet to post queue for tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await supabaseAdmin.from("scheduled_posts").insert({
    clerk_user_id: userId,
    platform: "twitter",
    content: parsed.tweet,
    scheduled_at: tomorrow.toISOString(),
    status: "pending",
  });

  // Mark notification as generated
  await supabaseAdmin
    .from("github_notifications")
    .update({ status: "generated" })
    .eq("id", notificationId);

  return NextResponse.json({ ok: true, tweet: parsed.tweet, linkedin: parsed.linkedin });
}

// DELETE — dismiss a notification
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await req.json();

  await supabaseAdmin
    .from("github_notifications")
    .update({ status: "dismissed" })
    .eq("id", notificationId)
    .eq("clerk_user_id", userId);

  return NextResponse.json({ ok: true });
}
