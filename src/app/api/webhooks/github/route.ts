import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeCommit } from "@/lib/github/classify";
import { extractMarketingSignal } from "@/lib/github/extract-signals";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) { console.error("[gh-webhook] GITHUB_WEBHOOK_SECRET not set"); return false; }
  if (!signature) { console.error("[gh-webhook] No signature header"); return false; }
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) {
      console.error("[gh-webhook] Sig length mismatch", sigBuf.length, expBuf.length);
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (e) {
    console.error("[gh-webhook] timingSafeEqual error:", e);
    return false;
  }
}

interface GitHubPushPayload {
  repository: { full_name: string };
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "unknown";
  const deliveryId = req.headers.get("x-github-delivery") ?? null;

  console.log("[gh-webhook] event:", event, "delivery:", deliveryId);

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // GitHub ping on webhook creation
  if (event === "ping") {
    console.log("[gh-webhook] Ping OK");
    return NextResponse.json({ ok: true, pong: true });
  }

  if (event !== "push") return NextResponse.json({ ok: true });

  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = payload.repository.full_name;
  const branch = payload.ref.replace("refs/heads/", "");

  // Store raw payload in webhook_deliveries (non-blocking, best-effort)
  let deliveryRowId: string | null = null;
  supabaseAdmin
    .from("webhook_deliveries")
    .insert({
      event_type: event,
      delivery_id: deliveryId,
      repo_full_name: repoFullName,
      raw_payload: JSON.parse(rawBody),
      processed: false,
    })
    .select("id")
    .single()
    .then(({ data }) => { deliveryRowId = data?.id ?? null; }, (err) => console.error("[gh-webhook] delivery insert error:", err));

  // Look up the connection to get clerk_user_id
  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("clerk_user_id")
    .eq("repo_full_name", repoFullName)
    .single();

  if (!conn) {
    console.error("[gh-webhook] No connection for repo:", repoFullName);
    return NextResponse.json({ ok: true, skipped: "no connection" });
  }

  const clerkUserId = conn.clerk_user_id;
  let processed = 0;
  let marketable = 0;
  let duplicates = 0;

  for (const rawCommit of payload.commits ?? []) {
    const normalized = normalizeCommit({
      sha: rawCommit.id,
      message: rawCommit.message,
      author: {
        name: rawCommit.author.name,
        email: rawCommit.author.email,
      },
      committed_at: rawCommit.timestamp,
      repo: repoFullName,
      branch,
      source: "webhook",
    });

    // Upsert into github_commits
    const { data: insertedCommit, error: insertError } = await supabaseAdmin
      .from("github_commits")
      .insert({
        clerk_user_id: clerkUserId,
        repo_full_name: repoFullName,
        sha: normalized.sha,
        message: normalized.message,
        title: normalized.title,
        body: normalized.body,
        author_name: normalized.author_name,
        author_email: normalized.author_email,
        committed_at: normalized.committed_at,
        branch: normalized.branch,
        commit_type: normalized.commit_type,
        is_marketable: normalized.is_marketable,
        marketing_score: normalized.marketing_score,
        detected_keywords: normalized.detected_keywords,
        status: "pending",
        source: normalized.source,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        duplicates++;
        continue;
      }
      console.error("[gh-webhook] commit insert error:", insertError.message);
      continue;
    }

    processed++;

    // For marketable commits (score >= 0.4), create marketing event candidate
    if (normalized.marketing_score >= 0.4 && insertedCommit) {
      const signal = extractMarketingSignal(
        { ...normalized, id: insertedCommit.id },
        clerkUserId
      );

      const { error: eventError } = await supabaseAdmin
        .from("marketing_event_candidates")
        .insert(signal);

      if (eventError) {
        console.error("[gh-webhook] event insert error:", eventError.message);
      } else {
        marketable++;
      }
    }
  }

  // Also keep legacy github_notifications for layout badge count (non-blocking)
  const marketableCommits = (payload.commits ?? [])
    .map((c) => c.message.split("\n")[0].trim())
    .filter((msg) => {
      const lower = msg.toLowerCase();
      return !["chore:", "ci:", "docs:", "style:", "test:", "revert:", "build:"].some((p) =>
        lower.startsWith(p)
      );
    });

  if (marketableCommits.length > 0) {
    const summary =
      marketableCommits.length === 1
        ? marketableCommits[0]
        : marketableCommits.length <= 3
        ? marketableCommits.join(", ")
        : `${marketableCommits.slice(0, 2).join(", ")}, and ${marketableCommits.length - 2} more changes`;

    supabaseAdmin
      .from("github_notifications")
      .insert({
        clerk_user_id: clerkUserId,
        repo_full_name: repoFullName,
        commit_messages: marketableCommits,
        summary,
        status: "pending",
      })
      .then(() => {}, (err) => console.error("[gh-webhook] legacy notification error:", err));
  }

  // Mark delivery as processed (best-effort)
  if (deliveryRowId) {
    supabaseAdmin
      .from("webhook_deliveries")
      .update({ processed: true })
      .eq("id", deliveryRowId)
      .then(() => {}, () => {});
  }

  console.log("[gh-webhook] processed:", processed, "marketable:", marketable, "duplicates:", duplicates);
  return NextResponse.json({ ok: true, processed, marketable, duplicates });
}
