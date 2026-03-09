import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUserId = (await params).id;
  const { plan } = await req.json() as { plan: "free" | "pro" | "studio" };

  if (!["free", "pro", "studio"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Fetch current plan for audit
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("plan")
    .eq("clerk_user_id", targetUserId)
    .maybeSingle();

  const oldPlan = (existing as { plan: string } | null)?.plan ?? "free";

  // Upsert subscription
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        clerk_user_id: targetUserId,
        plan,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "plan_change",
    target_user_id: targetUserId,
    metadata: { old_plan: oldPlan, new_plan: plan },
  });

  return NextResponse.json({ ok: true, plan });
}
