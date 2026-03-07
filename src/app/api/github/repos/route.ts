import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("access_token")
    .eq("clerk_user_id", userId)
    .single();

  if (!conn) return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  const res = await fetch("https://api.github.com/user/repos?sort=pushed&per_page=50", {
    headers: { Authorization: `Bearer ${conn.access_token}`, Accept: "application/vnd.github+json" },
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  const repos = await res.json();

  return NextResponse.json({
    repos: repos.map((r: { full_name: string; description: string | null; private: boolean; pushed_at: string }) => ({
      full_name: r.full_name,
      description: r.description,
      private: r.private,
      pushed_at: r.pushed_at,
    })),
  });
}
