import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  // Look up the coupon
  const { data: coupon, error: fetchErr } = await supabaseAdmin
    .from("admin_coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!coupon) return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 404 });

  const c = coupon as {
    id: string;
    code: string;
    plan: string;
    duration_days: number | null;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    active: boolean;
  };

  // Check expiry
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return NextResponse.json({ error: "This coupon has expired" }, { status: 410 });
  }

  // Check max uses
  if (c.max_uses !== null && c.used_count >= c.max_uses) {
    return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 410 });
  }

  // Check if user already redeemed this coupon
  const { data: existing } = await supabaseAdmin
    .from("admin_coupon_redemptions")
    .select("id")
    .eq("coupon_id", c.id)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You have already redeemed this coupon" }, { status: 409 });
  }

  // Calculate period end if duration_days set
  const periodEnd = c.duration_days
    ? new Date(Date.now() + c.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Upsert subscription
  const { error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        clerk_user_id: userId,
        plan: c.plan,
        status: "active",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" }
    );

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  // Record redemption + increment used_count
  await Promise.all([
    supabaseAdmin.from("admin_coupon_redemptions").insert({
      coupon_id: c.id,
      clerk_user_id: userId,
    }),
    supabaseAdmin
      .from("admin_coupons")
      .update({ used_count: c.used_count + 1 })
      .eq("id", c.id),
  ]);

  return NextResponse.json({
    ok: true,
    plan: c.plan,
    expires_at: periodEnd ?? "never",
    message: `Successfully upgraded to ${c.plan}!`,
  });
}
