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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Remove old webhook if switching repos
  if (conn.webhook_id && conn.repo_full_name && conn.repo_full_name !== repoFullName) {
    await fetch(`https://api.github.com/repos/${conn.repo_full_name}/hooks/${conn.webhook_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${conn.access_token}`, Accept: "application/vnd.github+json" },
    });
  }

  // Create webhook on the new repo
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

  const hookData = hookRes.ok ? await hookRes.json() : null;

  await supabaseAdmin.from("github_connections").upsert(
    {
      clerk_user_id: userId,
      repo_full_name: repoFullName,
      webhook_id: hookData?.id?.toString() ?? null,
      auto_generate: autoGenerate ?? true,
      auto_schedule: autoSchedule ?? false,
    },
    { onConflict: "clerk_user_id" }
  );

  return NextResponse.json({ success: true, webhookCreated: !!hookData });
}
