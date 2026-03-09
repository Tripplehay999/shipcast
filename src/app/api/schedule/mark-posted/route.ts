import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabaseAdmin
    .from("scheduled_posts")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clerk_user_id", userId);

  return NextResponse.json({ ok: true });
}
