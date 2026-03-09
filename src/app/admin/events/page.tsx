import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { Star, Zap } from "lucide-react";

const EVENT_TYPE_COLOR: Record<string, string> = {
  feature_release: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  bug_fix:         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  performance:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  integration:     "bg-violet-500/10 text-violet-400 border-violet-500/20",
  analytics:       "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  security:        "bg-red-500/10 text-red-400 border-red-500/20",
  ux_improvement:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  api_change:      "bg-orange-500/10 text-orange-400 border-orange-500/20",
  infrastructure:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  other:           "bg-zinc-500/10 text-zinc-500 border-zinc-700",
};

const STATUS_STYLE: Record<string, string> = {
  needs_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  promoted:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  dismissed:    "bg-zinc-800 text-zinc-500 border-zinc-700",
};

type EventStatusFilter = "all" | "needs_review" | "promoted" | "dismissed";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();

  const { status: statusFilter = "all", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const PAGE_SIZE = 50;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from("marketing_event_candidates")
    .select(
      `id, clerk_user_id, repo_full_name, event_type, short_summary, product_area,
       audience_value, likely_audience, launch_worthy, confidence, status, created_at,
       commit:github_commits!commit_id(sha, title, commit_type, committed_at, author_name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: events, count } = await query;

  // Status counts
  const [{ count: cReview }, { count: cPromoted }, { count: cDismissed }] = await Promise.all([
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "promoted"),
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "dismissed"),
  ]);

  // Fetch user names
  const userIds = [...new Set((events ?? []).map((e) => e.clerk_user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", userIds.length ? userIds : ["__none__"]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"])
  );

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Marketing Events</h1>
          <p className="text-zinc-500 text-sm mt-1">
            AI-detected marketing event candidates from commits — {count ?? 0} total
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {([
            { key: "all",          label: "All",          count: (cReview ?? 0) + (cPromoted ?? 0) + (cDismissed ?? 0) },
            { key: "needs_review", label: "Needs Review", count: cReview ?? 0 },
            { key: "promoted",     label: "Promoted",     count: cPromoted ?? 0 },
            { key: "dismissed",    label: "Dismissed",    count: cDismissed ?? 0 },
          ] as { key: EventStatusFilter; label: string; count: number }[]).map(({ key, label, count: c }) => (
            <Link
              key={key}
              href={`/admin/events${key === "all" ? "" : `?status=${key}`}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                (statusFilter ?? "all") === key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-[10px] text-zinc-600">{c}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User · Repo</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Event Type</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest w-1/4">Summary</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Audience</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Score</th>
              <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Launch</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">When</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  No events found
                </td>
              </tr>
            )}
            {(events ?? []).map((event) => {
              const scorePercent = Math.round((event.confidence ?? 0) * 100);
              const commit = event.commit as {
                sha: string;
                title: string;
                commit_type: string;
                committed_at: string;
                author_name: string | null;
              } | null;

              return (
                <tr key={event.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors align-top">
                  {/* User + Repo */}
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{nameMap.get(event.clerk_user_id) ?? "—"}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{event.repo_full_name}</p>
                    {commit && (
                      <p className="text-[10px] text-zinc-700 font-mono mt-0.5">
                        {commit.sha.slice(0, 7)} · {commit.author_name ?? "unknown"}
                      </p>
                    )}
                  </td>

                  {/* Event type */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      EVENT_TYPE_COLOR[event.event_type] ?? EVENT_TYPE_COLOR.other
                    }`}>
                      {(event.event_type ?? "other").replace(/_/g, " ")}
                    </span>
                    {event.product_area && (
                      <p className="text-[10px] text-zinc-600 mt-1">{event.product_area}</p>
                    )}
                  </td>

                  {/* Summary + commit title */}
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">
                      {event.short_summary ?? "—"}
                    </p>
                    {commit?.title && (
                      <p className="text-zinc-600 text-[10px] mt-1 line-clamp-1">{commit.title}</p>
                    )}
                  </td>

                  {/* Audience */}
                  <td className="px-4 py-3">
                    {event.likely_audience ? (
                      <p className="text-xs text-zinc-500 max-w-[120px] line-clamp-2">{event.likely_audience}</p>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Confidence score */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            scorePercent >= 70
                              ? "bg-emerald-500"
                              : scorePercent >= 40
                              ? "bg-amber-500"
                              : "bg-zinc-600"
                          }`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right">{scorePercent}%</span>
                    </div>
                  </td>

                  {/* Launch worthy */}
                  <td className="px-4 py-3 text-center">
                    {event.launch_worthy ? (
                      <Star className="h-3.5 w-3.5 text-yellow-400 mx-auto fill-yellow-400" />
                    ) : (
                      <span className="text-zinc-800">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      STATUS_STYLE[event.status] ?? STATUS_STYLE.needs_review
                    }`}>
                      {(event.status ?? "needs_review").replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-right text-xs text-zinc-600 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      <div className="flex items-center gap-6 text-xs text-zinc-600 px-1">
        <span className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-400" />
          {cReview ?? 0} awaiting review
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          {(events ?? []).filter((e) => e.launch_worthy).length} launch-worthy on this page
        </span>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/events?status=${statusFilter}&page=${page - 1}`}
            className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
              page <= 1 ? "pointer-events-none opacity-30" : ""
            }`}
          >
            ← Previous
          </Link>
          <span className="text-xs text-zinc-600">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/events?status=${statusFilter}&page=${page + 1}`}
            className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
              page >= totalPages ? "pointer-events-none opacity-30" : ""
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
