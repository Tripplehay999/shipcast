import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

// POST — add a flag or ban
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUserId = (await params).id;
  const { flag_type, note } = await req.json() as {
    flag_type: "spam" | "abuse" | "suspicious" | "chargeback" | "banned";
    note?: string;
  };

  const validTypes = ["spam", "abuse", "suspicious", "chargeback", "banned"];
  if (!validTypes.includes(flag_type)) {
    return NextResponse.json({ error: "Invalid flag type" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_flags")
    .insert({
      clerk_user_id: targetUserId,
      flag_type,
      note: note ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: flag_type === "banned" ? "ban_user" : "flag_user",
    target_user_id: targetUserId,
    metadata: { flag_type, note },
  });

  return NextResponse.json({ ok: true, flag: data });
}

// DELETE — resolve a flag
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUserId = (await params).id;
  const { flag_id } = await req.json() as { flag_id: string };

  const { error } = await supabaseAdmin
    .from("user_flags")
    .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", flag_id)
    .eq("clerk_user_id", targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "resolve_flag",
    target_user_id: targetUserId,
    metadata: { flag_id },
  });

  return NextResponse.json({ ok: true });
}
