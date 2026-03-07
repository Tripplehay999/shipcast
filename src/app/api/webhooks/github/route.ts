import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt } from "@/lib/prompts";
import { extractJson } from "@/lib/parse-json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Only process these conventional commit prefixes
const MARKETING_PREFIXES = ["feat:", "fix:", "perf:", "launch:", "release:"];

function isMarketingCommit(message: string): boolean {
  return MARKETING_PREFIXES.some((p) => message.toLowerCase().startsWith(p));
}

function parseCommitMessage(msg: string): string {
  // Strip prefix and scope: "feat(auth): add OAuth" → "add OAuth"
  return msg.replace(/^(feat|fix|perf|launch|release)(\([^)]+\))?:\s*/i, "").trim();
}

function buildUpdateSummary(commits: string[]): string {
  if (commits.length === 1) return commits[0];
  if (commits.length <= 3) return commits.join(", ");
  return `${commits.slice(0, 2).join(", ")}, and ${commits.length - 2} more improvements`;
}

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "push") return NextResponse.json({ ok: true });

  let payload: { repository: { full_name: string }; commits: Array<{ message: string }>; ref: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only process pushes to main/master
  const branch = payload.ref.replace("refs/heads/", "");
  if (!["main", "master"].includes(branch)) return NextResponse.json({ ok: true });

  const repoFullName = payload.repository.full_name;

  // Find the user with this repo connected
  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("clerk_user_id, auto_generate")
    .eq("repo_full_name", repoFullName)
    .single();

  if (!conn || !conn.auto_generate) return NextResponse.json({ ok: true });

  // Filter to marketing-relevant commits
  const marketingCommits = payload.commits
    .map((c) => c.message.split("\n")[0].trim()) // first line only
    .filter(isMarketingCommit)
    .map(parseCommitMessage)
    .filter(Boolean);

  if (!marketingCommits.length) return NextResponse.json({ ok: true, skipped: "no marketing commits" });

  const summary = buildUpdateSummary(marketingCommits);

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", conn.clerk_user_id)
    .single();

  const prompt = buildGenerationPrompt({
    rawUpdate: summary,
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

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = extractJson(responseText);
  if (!jsonStr) return NextResponse.json({ error: "AI parse failed" }, { status: 500 });

  const parsed = JSON.parse(jsonStr);

  // Save update
  const { data: update } = await supabaseAdmin
    .from("updates")
    .insert({
      clerk_user_id: conn.clerk_user_id,
      raw_update: `[GitHub] ${summary}`,
    })
    .select()
    .single();

  if (update) {
    await supabaseAdmin.from("generated_content").insert({
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
    });
  }

  return NextResponse.json({ ok: true, update_id: update?.id, commits_processed: marketingCommits.length });
}
