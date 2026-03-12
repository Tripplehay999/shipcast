import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

// PATCH — toggle or update a flag
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, enabled, plans } = await req.json() as {
    id: string;
    enabled?: boolean;
    plans?: string[];
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (enabled !== undefined) updates.enabled = enabled;
  if (plans !== undefined) updates.plans = plans;

  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "toggle_feature_flag",
    metadata: { flag_id: id, enabled, plans },
  });

  return NextResponse.json({ flag: data });
}

// POST — create a new flag
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, enabled, plans } = await req.json() as {
    name: string;
    description?: string;
    enabled?: boolean;
    plans?: string[];
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .insert({
      name: name.toLowerCase().replace(/\s+/g, "_"),
      description: description ?? null,
      enabled: enabled ?? false,
      plans: plans ?? [],
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Flag name already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flag: data });
}
