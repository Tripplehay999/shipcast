import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ announcements: data });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    title: string;
    body?: string;
    type?: string;
    target_plans?: string[];
    dismissible?: boolean;
    starts_at?: string;
    ends_at?: string;
    cta_label?: string;
    cta_href?: string;
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .insert({
      title: body.title.trim(),
      body: body.body?.trim() ?? null,
      type: body.type ?? "info",
      target_plans: body.target_plans ?? [],
      dismissible: body.dismissible ?? true,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      cta_label: body.cta_label ?? null,
      cta_href: body.cta_href ?? null,
      active: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "create_announcement",
    metadata: { id: data.id, title: body.title },
  });

  return NextResponse.json({ announcement: data });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, ...updates } = await req.json() as { id: string; [key: string]: unknown };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "update_announcement",
    metadata: { id, active: updates.active },
  });

  return NextResponse.json({ announcement: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  const { error } = await supabaseAdmin.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
