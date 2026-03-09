import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { Github, RefreshCw, Webhook, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminGithubPage() {
  await requireAdmin();

  const [
    { data: connections },
    { data: repositories },
    { data: syncRuns },
    { data: webhooks },
  ] = await Promise.all([
    supabaseAdmin
      .from("github_connections")
      .select("clerk_user_id, repo_full_name, auto_generate, auto_schedule, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("github_repositories")
      .select("clerk_user_id, repo_full_name, owner, name, default_branch, is_active, last_synced_at, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("sync_runs")
      .select("id, clerk_user_id, repo_full_name, status, commits_found, commits_new, error, started_at, completed_at")
      .order("started_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("webhook_deliveries")
      .select("id, event_type, delivery_id, repo_full_name, processed, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Fetch user product names
  const allUserIds = [
    ...new Set([
      ...(connections ?? []).map((c) => c.clerk_user_id),
      ...(repositories ?? []).map((r) => r.clerk_user_id),
      ...(syncRuns ?? []).map((s) => s.clerk_user_id),
    ]),
  ];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", allUserIds.length ? allUserIds : ["__none__"]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"])
  );

  const webhookTotal = (webhooks ?? []).length;
  const webhookErrors = (webhooks ?? []).filter((w) => w.error).length;
  const webhookProcessed = (webhooks ?? []).filter((w) => w.processed).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold">GitHub Integration</h1>
        <p className="text-zinc-500 text-sm mt-1">Connections, sync runs, and webhook deliveries</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Connections", value: connections?.length ?? 0, icon: Github, color: "text-zinc-400" },
          { label: "Active Repos", value: (repositories ?? []).filter((r) => r.is_active).length, icon: Github, color: "text-emerald-400" },
          { label: "Webhooks (last 50)", value: webhookTotal, icon: Webhook, color: "text-blue-400" },
          { label: "Webhook Errors", value: webhookErrors, icon: AlertTriangle, color: webhookErrors > 0 ? "text-red-400" : "text-zinc-600" },
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

      {/* GitHub Connections (legacy schema-v3) */}
      {(connections ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">
            GitHub Connections <span className="text-zinc-600 font-normal">({connections?.length})</span>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Repo</th>
                  <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Auto Gen</th>
                  <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Auto Schedule</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Connected</th>
                </tr>
              </thead>
              <tbody>
                {(connections ?? []).map((c) => (
                  <tr key={c.clerk_user_id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{nameMap.get(c.clerk_user_id) ?? "—"}</p>
                      <p className="text-[10px] text-zinc-700 font-mono">{c.clerk_user_id.slice(0, 14)}…</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{c.repo_full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {c.auto_generate ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.auto_schedule ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">{timeAgo(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Repositories */}
      {(repositories ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">
            Repositories <span className="text-zinc-600 font-normal">({repositories?.length})</span>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Repo</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Branch</th>
                  <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Active</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {(repositories ?? []).map((r) => (
                  <tr key={`${r.clerk_user_id}-${r.repo_full_name}`} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Github className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span className="text-white font-mono text-xs">{r.repo_full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{nameMap.get(r.clerk_user_id) ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{r.default_branch}</td>
                    <td className="px-4 py-3 text-center">
                      {r.is_active ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">active</span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {r.last_synced_at ? timeAgo(r.last_synced_at) : "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sync Runs */}
      {(syncRuns ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">Recent Sync Runs (last 30)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Repo</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Found</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">New</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Duration</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Started</th>
                </tr>
              </thead>
              <tbody>
                {(syncRuns ?? []).map((run) => {
                  const duration =
                    run.completed_at && run.started_at
                      ? Math.round(
                          (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
                        )
                      : null;
                  return (
                    <tr key={run.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 text-sm">{nameMap.get(run.clerk_user_id) ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{run.repo_full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex self-start text-[10px] border px-2 py-0.5 rounded-full font-medium ${
                            run.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : run.status === "running"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {run.status}
                          </span>
                          {run.error && (
                            <p className="text-[10px] text-red-400 max-w-[200px] truncate" title={run.error}>{run.error}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{run.commits_found}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-400">{run.commits_new}</td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-600">
                        {duration !== null ? `${duration}s` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500 whitespace-nowrap">
                        {timeAgo(run.started_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Webhook Deliveries */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Webhook Deliveries (last 50)
          </h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {webhookProcessed} processed
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              {webhookErrors} errors
            </span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Event</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Repo</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Delivery ID</th>
                <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Processed</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Error</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Received</th>
              </tr>
            </thead>
            <tbody>
              {(webhooks ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">
                    No webhook deliveries recorded
                  </td>
                </tr>
              )}
              {(webhooks ?? []).map((w) => (
                <tr key={w.id} className={`border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors ${w.error ? "bg-red-950/10" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {w.event_type ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{w.repo_full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 font-mono text-[10px]">
                    {w.delivery_id ? w.delivery_id.slice(0, 16) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {w.processed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-yellow-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-400 max-w-[200px]">
                    {w.error ? (
                      <span className="truncate block" title={w.error}>{w.error}</span>
                    ) : (
                      <span className="text-zinc-800">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-600 whitespace-nowrap">
                    {timeAgo(w.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
