import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";

// GET — fetch active announcements for this user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ announcements: [] });

  const [plan, { data: dismissed }] = await Promise.all([
    getUserPlan(userId),
    supabaseAdmin
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("clerk_user_id", userId),
  ]);

  const dismissedIds = (dismissed ?? []).map((d) => d.announcement_id);
  const now = new Date().toISOString();

  let query = supabaseAdmin
    .from("announcements")
    .select("id, title, body, type, dismissible, cta_label, cta_href, target_plans")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  if (dismissedIds.length > 0) {
    query = query.not("id", "in", `(${dismissedIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data } = await query;

  // Filter by plan
  const relevant = (data ?? []).filter((a) => {
    const targets = a.target_plans as string[];
    return targets.length === 0 || targets.includes(plan);
  });

  return NextResponse.json({ announcements: relevant });
}

// POST — dismiss an announcement
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };

  await supabaseAdmin
    .from("announcement_dismissals")
    .upsert({ announcement_id: id, clerk_user_id: userId }, { onConflict: "announcement_id,clerk_user_id" });

  return NextResponse.json({ ok: true });
}
