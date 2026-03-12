/**
 * GitHub Webhook Handler
 *
 * Receives push and release events from GitHub.
 * Stores raw commits → runs feature detection → creates commit groups.
 *
 * Setup: add https://yourapp.com/api/github/webhook as a GitHub webhook
 * with secret = GITHUB_WEBHOOK_SECRET env var.
 * Events: push, release, create
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyCommit, extractFeatureTitle } from "@/lib/feature-detector";
import { groupCommits, buildReleaseGroup } from "@/lib/commit-grouper";
import type { RawCommit } from "@/lib/commit-grouper";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";

// ─── HMAC verification ───────────────────────────────────────────────────────

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // dev mode: skip
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  if (!sig.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const receivedBuf = Buffer.from(sig, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

// ─── Resolve clerk_user_id from repo_full_name ───────────────────────────────

async function resolveUser(repoFullName: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("github_repositories")
    .select("clerk_user_id")
    .eq("repo_full_name", repoFullName)
    .eq("is_active", true)
    .single();
  return data?.clerk_user_id ?? null;
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody = await req.text();
  const event = req.headers.get("x-github-event") ?? "";
  const deliveryId = req.headers.get("x-github-delivery") ?? "";

  // Verify HMAC signature
  const valid = await verifySignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = (payload.repository as { full_name?: string })?.full_name ?? "";

  // Store raw delivery (non-blocking)
  void supabaseAdmin.from("webhook_deliveries").insert({
    event_type: event,
    delivery_id: deliveryId,
    repo_full_name: repoFullName,
    raw_payload: payload,
    processed: false,
  });

  // ── Push event ──────────────────────────────────────────────────────────────
  if (event === "push") {
    return handlePushEvent(payload, repoFullName);
  }

  // ── Release event ───────────────────────────────────────────────────────────
  if (event === "release") {
    const action = payload.action as string;
    if (action === "published") {
      return handleReleaseEvent(payload, repoFullName);
    }
    return NextResponse.json({ ok: true, skipped: `release action: ${action}` });
  }

  return NextResponse.json({ ok: true, skipped: `unhandled event: ${event}` });
}

// ─── Push event handler ──────────────────────────────────────────────────────

async function handlePushEvent(
  payload: Record<string, unknown>,
  repoFullName: string
): Promise<Response> {
  const clerkUserId = await resolveUser(repoFullName);
  if (!clerkUserId) {
    return NextResponse.json({ ok: true, skipped: "repo not connected" });
  }

  const branch = ((payload.ref as string) ?? "").replace("refs/heads/", "");
  const commits = (payload.commits as Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>) ?? [];

  if (commits.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no commits" });
  }

  // Classify and store each commit
  const insertedCommits: RawCommit[] = [];

  for (const commit of commits) {
    const signal = classifyCommit(commit.message);
    const title = extractFeatureTitle(commit.message);

    const row = {
      clerk_user_id: clerkUserId,
      repo_full_name: repoFullName,
      sha: commit.id,
      message: commit.message,
      title,
      author_name: commit.author.name,
      author_email: commit.author.email,
      committed_at: commit.timestamp,
      branch,
      commit_type: commit.message.match(/^(\w+)(?:\([^)]+\))?!?:/)?.[1] ?? "unknown",
      is_marketable: signal.isMarketable,
      marketing_score: signal.score,
      detected_keywords: signal.keywords,
      status: "pending",
      source: "webhook",
    };

    const { data, error } = await supabaseAdmin
      .from("github_commits")
      .upsert(row, { onConflict: "repo_full_name,sha", ignoreDuplicates: true })
      .select("id, message, commit_type, committed_at, repo_full_name, clerk_user_id")
      .single();

    if (!error && data) {
      insertedCommits.push({
        id: data.id,
        message: data.message,
        commit_type: data.commit_type,
        committed_at: data.committed_at,
        repo_full_name: data.repo_full_name,
        clerk_user_id: data.clerk_user_id,
      });
    }
  }

  // Group marketable commits
  const marketable = insertedCommits.filter((c) => {
    const sig = classifyCommit(c.message, c.commit_type);
    return sig.isMarketable;
  });

  if (marketable.length === 0) {
    return NextResponse.json({ ok: true, stored: insertedCommits.length, groups: 0 });
  }

  const groups = groupCommits(marketable);

  // Save commit groups (dedup by fingerprint)
  let savedGroups = 0;
  for (const group of groups) {
    if (!group.isMarketable) continue;

    // Check if this fingerprint was already announced recently (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("commit_groups")
      .select("id, status")
      .eq("clerk_user_id", clerkUserId)
      .eq("dedup_fingerprint", group.deduplicationFingerprint)
      .gte("created_at", thirtyDaysAgo)
      .not("status", "eq", "ignored")
      .limit(1)
      .single();

    if (existing) continue; // duplicate — skip

    await supabaseAdmin.from("commit_groups").insert({
      clerk_user_id: clerkUserId,
      repo_full_name: repoFullName,
      title: group.title,
      category: group.category,
      commit_ids: group.commitIds,
      primary_commit_id: group.primaryCommitId || null,
      commit_type_counts: group.commitTypeCounts,
      detected_keywords: group.detectedKeywords,
      signal_score: group.signalScore,
      is_marketable: group.isMarketable,
      status: "pending",
      source: "github",
      dedup_fingerprint: group.deduplicationFingerprint,
    });

    savedGroups++;
  }

  // Mark webhook as processed
  void supabaseAdmin
    .from("webhook_deliveries")
    .update({ processed: true })
    .eq("repo_full_name", repoFullName)
    .is("error", null);

  return NextResponse.json({
    ok: true,
    stored: insertedCommits.length,
    marketable: marketable.length,
    groups: savedGroups,
  });
}

// ─── Release event handler ───────────────────────────────────────────────────

async function handleReleaseEvent(
  payload: Record<string, unknown>,
  repoFullName: string
): Promise<Response> {
  const clerkUserId = await resolveUser(repoFullName);
  if (!clerkUserId) {
    return NextResponse.json({ ok: true, skipped: "repo not connected" });
  }

  const release = payload.release as {
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    published_at: string;
  };

  if (release.draft) {
    return NextResponse.json({ ok: true, skipped: "draft release" });
  }

  // Store release
  const { data: releaseRow, error: releaseErr } = await supabaseAdmin
    .from("github_releases")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        repo_full_name: repoFullName,
        tag_name: release.tag_name,
        release_name: release.name,
        body: release.body,
        is_prerelease: release.prerelease,
        is_draft: release.draft,
        published_at: release.published_at,
      },
      { onConflict: "repo_full_name,tag_name" }
    )
    .select("id")
    .single();

  if (releaseErr || !releaseRow) {
    return NextResponse.json({ error: "Failed to store release" }, { status: 500 });
  }

  // Fetch recent commits since last release
  const { data: recentCommits } = await supabaseAdmin
    .from("github_commits")
    .select("id, message, commit_type, committed_at, repo_full_name, clerk_user_id")
    .eq("clerk_user_id", clerkUserId)
    .eq("repo_full_name", repoFullName)
    .gte("committed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("committed_at", { ascending: false })
    .limit(100);

  const releaseGroup = buildReleaseGroup(
    (recentCommits ?? []) as RawCommit[],
    release.tag_name,
    release.name,
    clerkUserId,
    repoFullName
  );

  // Save release commit group
  const { data: groupRow } = await supabaseAdmin
    .from("commit_groups")
    .insert({
      clerk_user_id: clerkUserId,
      repo_full_name: repoFullName,
      title: releaseGroup.title,
      category: "release",
      commit_ids: releaseGroup.commitIds,
      primary_commit_id: releaseGroup.primaryCommitId || null,
      release_id: releaseRow.id,
      commit_type_counts: releaseGroup.commitTypeCounts,
      detected_keywords: releaseGroup.detectedKeywords,
      signal_score: releaseGroup.signalScore,
      is_marketable: true,
      status: "pending",
      source: "release",
      dedup_fingerprint: releaseGroup.deduplicationFingerprint,
    })
    .select("id")
    .single();

  // Update release with group ID
  if (groupRow) {
    await supabaseAdmin
      .from("github_releases")
      .update({ announcement_id: null })
      .eq("id", releaseRow.id);
  }

  return NextResponse.json({
    ok: true,
    release: release.tag_name,
    commitGroupId: groupRow?.id ?? null,
    commitCount: releaseGroup.commitIds.length,
  });
}
