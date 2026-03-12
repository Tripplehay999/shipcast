/**
 * GET  /api/automation/groups  — list commit groups for the authenticated user
 * PATCH /api/automation/groups  — update group status (ignore, reprocess)
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));

  const { data, error } = await supabaseAdmin
    .from("commit_groups")
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { id: string; status: string };
  const { id, status } = body;

  if (!id || !status) return NextResponse.json({ error: "Missing id or status" }, { status: 400 });

  const allowed = ["pending", "ignored", "announced"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("commit_groups")
    .update({ status })
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}
