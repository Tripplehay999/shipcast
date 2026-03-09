import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { TicketActions } from "@/components/admin/ticket-actions";

const PRIORITY_STYLE: Record<string, string> = {
  low:    "bg-zinc-800 text-zinc-500 border-zinc-700",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed:      "bg-zinc-800 text-zinc-500 border-zinc-700",
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const adminId = await requireAdmin();
  const { status: statusFilter = "open" } = await searchParams;

  let query = supabaseAdmin
    .from("admin_tickets")
    .select("id, user_clerk_id, subject, body, status, priority, assigned_to, created_by, resolved_at, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data: tickets } = await query;

  // Status counts
  const [{ count: cOpen }, { count: cProgress }, { count: cResolved }, { count: cClosed }] =
    await Promise.all([
      supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
      supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "closed"),
    ]);

  // Fetch user product names
  const userIds = [...new Set((tickets ?? []).filter((t) => t.user_clerk_id).map((t) => t.user_clerk_id!))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", userIds.length ? userIds : ["__none__"]);

  const nameMap = new Map((profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"]));

  // Sort by priority within status group
  const sorted = (tickets ?? []).sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99;
    return pa - pb;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Support Tickets</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage user support requests and internal tasks
          </p>
        </div>
        <Link
          href="/admin/tickets/new"
          className="text-xs px-3 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
        >
          + New Ticket
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 self-start w-fit">
        {([
          { key: "all",         label: "All",         count: (cOpen ?? 0) + (cProgress ?? 0) + (cResolved ?? 0) + (cClosed ?? 0) },
          { key: "open",        label: "Open",        count: cOpen ?? 0 },
          { key: "in_progress", label: "In Progress", count: cProgress ?? 0 },
          { key: "resolved",    label: "Resolved",    count: cResolved ?? 0 },
          { key: "closed",      label: "Closed",      count: cClosed ?? 0 },
        ] as { key: StatusFilter; label: string; count: number }[]).map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/admin/tickets?status=${key}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
            }`}
          >
            {label}
            <span className="ml-1.5 text-[10px] text-zinc-600">{count}</span>
          </Link>
        ))}
      </div>

      {/* Tickets list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm bg-zinc-900/40 border border-zinc-800 rounded-xl">
          No tickets found.{" "}
          <Link href="/admin/tickets/new" className="text-zinc-400 underline">Create one →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ticket) => (
            <div
              key={ticket.id}
              className={`bg-zinc-900 border rounded-xl p-4 hover:border-zinc-700 transition-colors ${
                ticket.priority === "urgent"
                  ? "border-red-800/60"
                  : ticket.priority === "high"
                  ? "border-amber-800/40"
                  : "border-zinc-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Left: badges + content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[ticket.status] ?? ""}`}>
                      {ticket.status.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[ticket.priority] ?? ""}`}>
                      {ticket.priority}
                    </span>
                    {ticket.user_clerk_id && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {nameMap.get(ticket.user_clerk_id) ?? ticket.user_clerk_id.slice(0, 12) + "…"}
                      </span>
                    )}
                    {ticket.assigned_to && (
                      <span className="text-[10px] text-zinc-600">
                        → {ticket.assigned_to.slice(0, 10)}…
                      </span>
                    )}
                  </div>

                  <p className="text-white font-medium text-sm">{ticket.subject}</p>

                  {ticket.body && (
                    <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{ticket.body}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-zinc-700">
                    <span>#{ticket.id.slice(0, 8)}</span>
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                    {ticket.resolved_at && (
                      <span className="text-emerald-600">
                        Resolved {new Date(ticket.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <TicketActions
                  ticketId={ticket.id}
                  currentStatus={ticket.status}
                  currentPriority={ticket.priority}
                  adminId={adminId}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
