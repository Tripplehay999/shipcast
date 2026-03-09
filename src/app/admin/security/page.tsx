import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { ShieldAlert, Activity, AlertTriangle } from "lucide-react";

const ACTION_COLOR: Record<string, string> = {
  plan_change:       "text-blue-400",
  ban_user:          "text-red-400",
  unban_user:        "text-emerald-400",
  flag_user:         "text-amber-400",
  resolve_flag:      "text-emerald-400",
  create_coupon:     "text-violet-400",
  deactivate_coupon: "text-orange-400",
  create_ticket:     "text-zinc-400",
  resolve_ticket:    "text-emerald-400",
  delete_ticket:     "text-red-400",
  update_ticket:     "text-zinc-400",
};

const FLAG_STYLE: Record<string, string> = {
  spam:        "bg-orange-500/10 text-orange-400 border-orange-500/20",
  abuse:       "bg-red-500/10 text-red-400 border-red-500/20",
  suspicious:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  chargeback:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  banned:      "bg-red-900/40 text-red-300 border-red-800",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MetadataDisplay({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return null;
  const entries = Object.entries(meta).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([k, v]) => (
        <span key={k} className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
          {k}: {String(v)}
        </span>
      ))}
    </div>
  );
}

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const { page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const PAGE_SIZE = 60;
  const from = (page - 1) * PAGE_SIZE;

  const [
    { data: auditLog, count: auditCount },
    { data: activeFlags },
    { count: bannedCount },
  ] = await Promise.all([
    supabaseAdmin
      .from("admin_audit_log")
      .select("id, admin_user_id, action, target_user_id, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabaseAdmin
      .from("user_flags")
      .select("id, clerk_user_id, flag_type, note, created_by, created_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("user_flags")
      .select("*", { count: "exact", head: true })
      .eq("flag_type", "banned")
      .is("resolved_at", null),
  ]);

  // Collect all user IDs
  const allUserIds = [
    ...new Set([
      ...(auditLog ?? []).map((a) => a.admin_user_id),
      ...(auditLog ?? []).filter((a) => a.target_user_id).map((a) => a.target_user_id!),
      ...(activeFlags ?? []).map((f) => f.clerk_user_id),
    ]),
  ];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", allUserIds.length ? allUserIds : ["__none__"]);

  const nameMap = new Map((profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"]));

  const totalPages = auditCount ? Math.ceil(auditCount / PAGE_SIZE) : 1;

  // Group audit log by action type counts
  const actionCounts: Record<string, number> = {};
  for (const entry of auditLog ?? []) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold">Security</h1>
        <p className="text-zinc-500 text-sm mt-1">Audit log, active flags, and banned users.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Audit Entries",
            value: auditCount ?? 0,
            icon: Activity,
            color: "text-zinc-400",
          },
          {
            label: "Active Flags",
            value: (activeFlags ?? []).length,
            icon: ShieldAlert,
            color: (activeFlags ?? []).length > 0 ? "text-amber-400" : "text-zinc-600",
          },
          {
            label: "Banned Users",
            value: bannedCount ?? 0,
            icon: AlertTriangle,
            color: (bannedCount ?? 0) > 0 ? "text-red-400" : "text-zinc-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Active Flags */}
      {(activeFlags ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">
            Active Flags
            <span className="ml-2 text-xs font-normal text-zinc-600">
              ({(activeFlags ?? []).length} unresolved)
            </span>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Flag</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Note</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Flagged by</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">When</th>
                </tr>
              </thead>
              <tbody>
                {(activeFlags ?? []).map((flag) => (
                  <tr
                    key={flag.id}
                    className={`border-b border-zinc-800/50 last:border-0 ${
                      flag.flag_type === "banned" ? "bg-red-950/10" : "hover:bg-zinc-800/20"
                    } transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{nameMap.get(flag.clerk_user_id) ?? "—"}</p>
                      <p className="text-[10px] text-zinc-700 font-mono">{flag.clerk_user_id.slice(0, 16)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${FLAG_STYLE[flag.flag_type] ?? ""}`}>
                        {flag.flag_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                      {flag.note ?? <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 font-mono">
                      {(flag.created_by ?? "").slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-600">
                      {timeAgo(flag.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-700 mt-2">
            To resolve flags, go to <a href="/admin/users" className="underline text-zinc-500">Users →</a> and click the ✕ next to each flag.
          </p>
        </section>
      )}

      {/* Audit Log */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Audit Log
            <span className="ml-2 text-xs font-normal text-zinc-600">
              {auditCount ?? 0} total entries · page {page} of {totalPages}
            </span>
          </h2>
          {/* Action frequency pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(actionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([action, count]) => (
                <span key={action} className="text-[9px] font-mono bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  {action} ×{count}
                </span>
              ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Admin</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Action</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Target</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Details</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">When</th>
              </tr>
            </thead>
            <tbody>
              {(auditLog ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                    No audit entries yet. Actions will appear here.
                  </td>
                </tr>
              )}
              {(auditLog ?? []).map((entry) => (
                <tr key={entry.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/10 transition-colors">
                  {/* Admin */}
                  <td className="px-4 py-3 text-xs text-zinc-600 font-mono">
                    {entry.admin_user_id.slice(0, 14)}…
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${ACTION_COLOR[entry.action] ?? "text-zinc-400"}`}>
                      {entry.action}
                    </span>
                  </td>

                  {/* Target */}
                  <td className="px-4 py-3">
                    {entry.target_user_id ? (
                      <div>
                        <p className="text-zinc-300 text-xs">{nameMap.get(entry.target_user_id) ?? "—"}</p>
                        <p className="text-[10px] text-zinc-700 font-mono">{entry.target_user_id.slice(0, 14)}…</p>
                      </div>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Metadata */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <MetadataDisplay meta={entry.metadata as Record<string, unknown> | null} />
                  </td>

                  {/* When */}
                  <td className="px-4 py-3 text-right text-xs text-zinc-600 whitespace-nowrap">
                    {timeAgo(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <a
              href={`/admin/security?page=${page - 1}`}
              className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
                page <= 1 ? "pointer-events-none opacity-30" : ""
              }`}
            >
              ← Previous
            </a>
            <span className="text-xs text-zinc-600">Page {page} of {totalPages}</span>
            <a
              href={`/admin/security?page=${page + 1}`}
              className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
                page >= totalPages ? "pointer-events-none opacity-30" : ""
              }`}
            >
              Next →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
