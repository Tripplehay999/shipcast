import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const IGNORE_PREFIXES = ["chore:", "ci:", "docs:", "style:", "test:", "revert:", "build:"];

function shouldIgnoreCommit(message: string): boolean {
  return IGNORE_PREFIXES.some((p) => message.toLowerCase().startsWith(p));
}

// Strip conventional commit prefix for cleaner display
function parseCommitMessage(msg: string): string {
  return msg.replace(/^\w+(\([^)]+\))?:\s*/i, "").trim() || msg.trim();
}

function buildSummary(commits: string[]): string {
  if (commits.length === 1) return commits[0];
  if (commits.length <= 3) return commits.join(", ");
  return `${commits.slice(0, 2).join(", ")}, and ${commits.length - 2} more changes`;
}

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) { console.error("[gh-webhook] GITHUB_WEBHOOK_SECRET not set"); return false; }
  if (!signature) { console.error("[gh-webhook] No signature header"); return false; }
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) { console.error("[gh-webhook] Sig length mismatch", sigBuf.length, expBuf.length); return false; }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (e) {
    console.error("[gh-webhook] timingSafeEqual error:", e);
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event");

  console.log("[gh-webhook] event:", event, "sig:", sig.slice(0, 30));

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // GitHub ping on webhook creation
  if (event === "ping") {
    console.log("[gh-webhook] Ping OK");
    return NextResponse.json({ ok: true, pong: true });
  }

  if (event !== "push") return NextResponse.json({ ok: true });

  let payload: {
    repository: { full_name: string };
    commits: Array<{ message: string }>;
    ref: string;
  };
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const branch = payload.ref.replace("refs/heads/", "");
  console.log("[gh-webhook] branch:", branch, "repo:", payload.repository.full_name);

  if (!["main", "master"].includes(branch)) {
    return NextResponse.json({ ok: true, skipped: `branch=${branch}` });
  }

  const repoFullName = payload.repository.full_name;

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("clerk_user_id")
    .eq("repo_full_name", repoFullName)
    .single();

  if (!conn) {
    console.error("[gh-webhook] No connection for repo:", repoFullName);
    return NextResponse.json({ ok: true, skipped: "no connection" });
  }

  const allCommits = payload.commits
    .map((c) => c.message.split("\n")[0].trim())
    .filter((msg) => !shouldIgnoreCommit(msg));

  const marketingCommits = allCommits.map(parseCommitMessage).filter(Boolean);

  console.log("[gh-webhook] Commits to notify:", marketingCommits);

  if (!marketingCommits.length) {
    return NextResponse.json({ ok: true, skipped: "only ignored commits (chore/ci/docs/etc)" });
  }

  const summary = buildSummary(marketingCommits);

  const { error } = await supabaseAdmin.from("github_notifications").insert({
    clerk_user_id: conn.clerk_user_id,
    repo_full_name: repoFullName,
    commit_messages: marketingCommits,
    summary,
    status: "pending",
  });

  if (error) {
    console.error("[gh-webhook] DB insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[gh-webhook] Notification saved for:", conn.clerk_user_id);
  return NextResponse.json({ ok: true, commits: marketingCommits.length });
}
