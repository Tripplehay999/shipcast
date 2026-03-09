import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

// GET — list all coupons with redemption counts
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  let query = supabaseAdmin
    .from("admin_coupons")
    .select("*, redemptions:admin_coupon_redemptions(count)")
    .order("created_at", { ascending: false });

  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ coupons: data });
}

// POST — create coupon
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    code?: string;
    plan: "pro" | "studio";
    duration_days?: number | null;
    max_uses?: number | null;
    expires_at?: string | null;
    note?: string;
  };

  if (!["pro", "studio"].includes(body.plan)) {
    return NextResponse.json({ error: "plan must be pro or studio" }, { status: 400 });
  }

  // Auto-generate code if not provided
  const code = (body.code?.toUpperCase().trim()) ||
    `${body.plan.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { data, error } = await supabaseAdmin
    .from("admin_coupons")
    .insert({
      code,
      plan: body.plan,
      duration_days: body.duration_days ?? null,
      max_uses: body.max_uses ?? null,
      expires_at: body.expires_at ?? null,
      note: body.note ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "create_coupon",
    metadata: { coupon_id: data.id, code, plan: body.plan },
  });

  return NextResponse.json({ coupon: data });
}

// DELETE — deactivate a coupon
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json() as { id: string };

  const { error } = await supabaseAdmin
    .from("admin_coupons")
    .update({ active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "deactivate_coupon",
    metadata: { coupon_id: id },
  });

  return NextResponse.json({ ok: true });
}
