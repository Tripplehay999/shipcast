/**
 * GET  /api/automation/announcements — list announcement objects for the user
 * PATCH /api/automation/announcements — approve / reject an announcement
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "draft";
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));

  const { data, error } = await supabaseAdmin
    .from("announcement_objects")
    .select("*, content_scores(format, score, feedback, needs_regeneration)")
    .eq("clerk_user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    id: string;
    status?: "approved" | "rejected";
    feature_name?: string;
    headline?: string;
    summary?: string;
    benefits?: string[];
    story?: string;
    cta?: string;
  };

  const { id, status, ...editableFields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (editableFields.feature_name) updates.feature_name = editableFields.feature_name;
  if (editableFields.headline) updates.headline = editableFields.headline;
  if (editableFields.summary) updates.summary = editableFields.summary;
  if (editableFields.benefits) updates.benefits = editableFields.benefits;
  if (editableFields.story !== undefined) updates.story = editableFields.story;
  if (editableFields.cta) updates.cta = editableFields.cta;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("announcement_objects")
    .update(updates)
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}
