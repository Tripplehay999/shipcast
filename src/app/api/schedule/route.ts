import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const plan = await getUserPlan(userId);
    if (plan !== "studio") {
      return NextResponse.json({ error: "Studio plan required for scheduling." }, { status: 403 });
    }

    const { platform, content, scheduledAt, updateId } = await req.json() as {
      platform: "twitter" | "linkedin";
      content: string;
      scheduledAt: string;
      updateId?: string;
    };

    if (!platform || !content || !scheduledAt) {
      return NextResponse.json({ error: "platform, content, and scheduledAt are required" }, { status: 400 });
    }

    if (new Date(scheduledAt) <= new Date()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        clerk_user_id: userId,
        update_id: updateId ?? null,
        platform,
        content,
        scheduled_at: scheduledAt,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ scheduled: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("scheduled_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ posts: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
