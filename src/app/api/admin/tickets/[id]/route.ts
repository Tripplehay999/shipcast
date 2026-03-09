import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(userId);
}

// PATCH — update status / priority / assigned_to + add note
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = (await params).id;
  const body = await req.json() as {
    status?: "open" | "in_progress" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
    assigned_to?: string | null;
    note?: string;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status)      updates.status      = body.status;
  if (body.priority)    updates.priority    = body.priority;
  if ("assigned_to" in body) updates.assigned_to = body.assigned_to ?? null;
  if (body.status === "resolved") updates.resolved_at = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("admin_tickets")
    .update(updates)
    .eq("id", ticketId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Add note if provided
  if (body.note?.trim()) {
    await supabaseAdmin.from("admin_ticket_notes").insert({
      ticket_id: ticketId,
      admin_user_id: userId,
      note: body.note.trim(),
    });
  }

  // Log significant status changes
  if (body.status) {
    const action = body.status === "resolved" ? "resolve_ticket" : "update_ticket";
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: userId,
      action,
      metadata: { ticket_id: ticketId, status: body.status },
    });
  }

  return NextResponse.json({ ok: true });
}

// GET — fetch single ticket with notes
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = (await params).id;

  const [{ data: ticket }, { data: notes }] = await Promise.all([
    supabaseAdmin.from("admin_tickets").select("*").eq("id", ticketId).single(),
    supabaseAdmin
      .from("admin_ticket_notes")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ ticket, notes });
}

// DELETE — delete ticket
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = (await params).id;

  const { error } = await supabaseAdmin
    .from("admin_tickets")
    .delete()
    .eq("id", ticketId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: userId,
    action: "delete_ticket",
    metadata: { ticket_id: ticketId },
  });

  return NextResponse.json({ ok: true });
}
