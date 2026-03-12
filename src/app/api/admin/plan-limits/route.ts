import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("plan_limits")
    .select("*")
    .order("plan");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ limits: data });
}

export async function PATCH(req: Request) {
  const adminId = await requireAdmin();
  const body = await req.json();
  const { id, updates_per_month, scheduled_posts_limit, github_repos_limit, ai_calls_per_day, content_formats } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("plan_limits")
    .update({
      updates_per_month: updates_per_month ?? null,
      scheduled_posts_limit: scheduled_posts_limit ?? null,
      github_repos_limit: github_repos_limit ?? null,
      ai_calls_per_day: ai_calls_per_day ?? null,
      content_formats: content_formats ?? null,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ limit: data });
}
