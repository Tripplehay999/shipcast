import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repoFullName, autoGenerate, autoSchedule } = await req.json();
  if (!repoFullName) return NextResponse.json({ error: "repo_full_name required" }, { status: 400 });

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("access_token, webhook_id, repo_full_name")
    .eq("clerk_user_id", userId)
    .single();

  if (!conn) return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL!;

  // Save settings to DB first so they always persist regardless of webhook outcome
  await supabaseAdmin.from("github_connections").upsert(
    {
      clerk_user_id: userId,
      repo_full_name: repoFullName,
      auto_generate: autoGenerate ?? true,
      auto_schedule: autoSchedule ?? false,
    },
    { onConflict: "clerk_user_id" }
  );

  // Delete any existing webhook (always refresh to ensure correct URL)
  if (conn.webhook_id && conn.repo_full_name) {
    await fetch(`https://api.github.com/repos/${conn.repo_full_name}/hooks/${conn.webhook_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${conn.access_token}`, Accept: "application/vnd.github+json" },
    });
  }

  // Install fresh webhook
  const hookRes = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: `${appUrl}/api/webhooks/github`,
        content_type: "json",
        secret: process.env.GITHUB_WEBHOOK_SECRET!,
      },
    }),
  });

  if (!hookRes.ok) {
    const err = await hookRes.json().catch(() => ({}));
    const message = err?.message ?? `GitHub API error ${hookRes.status}`;
    // Settings saved but webhook failed — return error so user knows
    return NextResponse.json(
      { error: `Settings saved, but webhook install failed: ${message}. Make sure you authorized repo access.` },
      { status: 400 }
    );
  }

  const hookData = await hookRes.json();

  // Save webhook ID
  await supabaseAdmin.from("github_connections")
    .update({ webhook_id: hookData.id?.toString() ?? null })
    .eq("clerk_user_id", userId);

  return NextResponse.json({ success: true, webhookUrl: `${appUrl}/api/webhooks/github` });
}
