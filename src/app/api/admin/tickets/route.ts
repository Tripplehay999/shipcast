import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

// GET — list tickets
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  let query = supabaseAdmin
    .from("admin_tickets")
    .select("*, notes:admin_ticket_notes(count)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("priority", priority);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: data });
}

// POST — create ticket
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    subject: string;
    body?: string;
    user_clerk_id?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    assigned_to?: string;
  };

  if (!body.subject?.trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_tickets")
    .insert({
      subject: body.subject.trim(),
      body: body.body?.trim() ?? null,
      user_clerk_id: body.user_clerk_id ?? null,
      priority: body.priority ?? "medium",
      assigned_to: body.assigned_to ?? null,
      created_by: userId,
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "create_ticket",
    target_user_id: body.user_clerk_id ?? null,
    metadata: { ticket_id: data.id, subject: body.subject },
  });

  return NextResponse.json({ ticket: data });
}
