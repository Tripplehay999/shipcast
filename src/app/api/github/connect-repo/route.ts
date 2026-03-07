import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repoFullName, autoGenerate, autoSchedule } = await req.json();
  if (!repoFullName) return NextResponse.json({ error: "repo_full_name required" }, { status: 400 });
  if (!/^[\w.-]+\/[\w.-]+$/.test(repoFullName)) {
    return NextResponse.json({ error: "Invalid repo name" }, { status: 400 });
  }

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("access_token, webhook_id, repo_full_name")
    .eq("clerk_user_id", userId)
    .single();

  if (!conn) return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL!;
  const webhookUrl = `${appUrl}/api/webhooks/github`;

  const ghHeaders = {
    Authorization: `Bearer ${conn.access_token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Save settings first so they always persist
  await supabaseAdmin.from("github_connections").upsert(
    {
      clerk_user_id: userId,
      repo_full_name: repoFullName,
      auto_generate: autoGenerate ?? true,
      auto_schedule: autoSchedule ?? false,
    },
    { onConflict: "clerk_user_id" }
  );

  // List ALL existing hooks on this repo and delete any pointing to our URL
  // This handles cases where webhook_id wasn't saved from a previous attempt
  const listRes = await fetch(`https://api.github.com/repos/${repoFullName}/hooks?per_page=100`, {
    headers: ghHeaders,
  });

  if (listRes.ok) {
    const existingHooks: Array<{ id: number; config: { url: string } }> = await listRes.json().catch(() => []);
    const toDelete = existingHooks.filter((h) => h.config?.url === webhookUrl);
    await Promise.all(
      toDelete.map((h) =>
        fetch(`https://api.github.com/repos/${repoFullName}/hooks/${h.id}`, {
          method: "DELETE",
          headers: ghHeaders,
        })
      )
    );
  }

  // Also delete the stored webhook on old repo if switching repos
  if (conn.webhook_id && conn.repo_full_name && conn.repo_full_name !== repoFullName) {
    await fetch(`https://api.github.com/repos/${conn.repo_full_name}/hooks/${conn.webhook_id}`, {
      method: "DELETE",
      headers: ghHeaders,
    });
  }

  // Install fresh webhook
  const hookRes = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: process.env.GITHUB_WEBHOOK_SECRET!,
        insecure_ssl: "0",
      },
    }),
  });

  if (!hookRes.ok) {
    const err = await hookRes.json().catch(() => ({}));
    const details = err?.errors?.[0]?.message ?? err?.message ?? `GitHub API ${hookRes.status}`;
    return NextResponse.json(
      { error: `Webhook install failed: ${details}` },
      { status: 400 }
    );
  }

  const hookData = await hookRes.json();

  await supabaseAdmin.from("github_connections")
    .update({ webhook_id: hookData.id?.toString() ?? null })
    .eq("clerk_user_id", userId);

  return NextResponse.json({ success: true, webhookUrl });
}
