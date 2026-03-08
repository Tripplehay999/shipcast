import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("github_commits")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("committed_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[commits] Query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commits: data ?? [] });
}
