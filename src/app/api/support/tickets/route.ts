import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST — user creates a support ticket
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    subject: string;
    body?: string;
    type?: string;
  };

  if (!body.subject?.trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (body.subject.length > 200) {
    return NextResponse.json({ error: "Subject too long (max 200 chars)" }, { status: 400 });
  }
  if (body.body && body.body.length > 5000) {
    return NextResponse.json({ error: "Description too long (max 5000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_tickets")
    .insert({
      user_clerk_id: userId,
      subject: body.subject.trim(),
      body: body.body?.trim() ?? null,
      priority: "medium",
      status: "open",
      created_by: userId,
      metadata: { type: body.type ?? "general", source: "user_portal" },
    })
    .select("id, subject, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ticket: data });
}

// GET — user views their own tickets
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("admin_tickets")
    .select("id, subject, body, status, priority, created_at, updated_at, resolved_at")
    .eq("user_clerk_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Redact: users only see their own tickets, no admin notes exposed
  return NextResponse.json({ tickets: data });
}
