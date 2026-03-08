import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncRepoCommits } from "@/lib/github/sync";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("access_token, repo_full_name, default_branch")
    .eq("clerk_user_id", userId)
    .single();

  if (!conn) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  if (!conn.repo_full_name) {
    return NextResponse.json({ error: "No repository selected" }, { status: 400 });
  }

  const result = await syncRepoCommits(
    userId,
    conn.repo_full_name,
    conn.access_token,
    conn.default_branch ?? "main"
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
