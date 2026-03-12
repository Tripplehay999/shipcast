import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

// Claude Sonnet 4.6 pricing (per million tokens, as of 2025)
const INPUT_COST_PER_M  = 3.00;
const OUTPUT_COST_PER_M = 15.00;

function costUSD(inputTokens: number, outputTokens: number) {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
}

function formatCost(usd: number) {
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(2)}`;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

export default async function AdminAILogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; endpoint?: string }>;
}) {
  await requireAdmin();

  const { page: pageStr = "1", endpoint: epFilter = "all" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const PAGE_SIZE = 50;
  const from = (page - 1) * PAGE_SIZE;

  const now = new Date();
  const dayAgo   = new Date(now.getTime() - 86400000).toISOString();
  const weekAgo  = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  let query = supabaseAdmin
    .from("ai_generation_logs")
    .select("id, clerk_user_id, endpoint, model, prompt_tokens, completion_tokens, total_tokens, duration_ms, success, error, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (epFilter !== "all") query = query.eq("endpoint", epFilter);

  const { data: logs, count } = await query;

  // Aggregate stats across time windows
  const [
    { data: dayStats },
    { data: weekStats },
    { data: monthStats },
    { data: endpointBreakdown },
  ] = await Promise.all([
    supabaseAdmin.from("ai_generation_logs").select("prompt_tokens, completion_tokens, success").gte("created_at", dayAgo),
    supabaseAdmin.from("ai_generation_logs").select("prompt_tokens, completion_tokens, success").gte("created_at", weekAgo),
    supabaseAdmin.from("ai_generation_logs").select("prompt_tokens, completion_tokens, success").gte("created_at", monthAgo),
    supabaseAdmin.from("ai_generation_logs").select("endpoint, success").gte("created_at", monthAgo),
  ]);

  function summarize(rows: Array<{ prompt_tokens: number | null; completion_tokens: number | null; success: boolean }>) {
    let inTokens = 0, outTokens = 0, calls = 0, errors = 0;
    for (const r of rows ?? []) {
      calls++;
      inTokens  += r.prompt_tokens ?? 0;
      outTokens += r.completion_tokens ?? 0;
      if (!r.success) errors++;
    }
    return { calls, inTokens, outTokens, cost: costUSD(inTokens, outTokens), errors };
  }

  const day   = summarize(dayStats   ?? []);
  const week  = summarize(weekStats  ?? []);
  const month = summarize(monthStats ?? []);

  // Endpoint breakdown for last 30 days
  const epMap: Record<string, { calls: number; errors: number }> = {};
  for (const r of endpointBreakdown ?? []) {
    const ep = (r as { endpoint: string; success: boolean }).endpoint;
    if (!epMap[ep]) epMap[ep] = { calls: 0, errors: 0 };
    epMap[ep].calls++;
    if (!(r as { success: boolean }).success) epMap[ep].errors++;
  }
  const endpoints = Object.keys(epMap).sort((a, b) => epMap[b].calls - epMap[a].calls);

  // User product names
  const userIds = [...new Set((logs ?? []).map((l) => l.clerk_user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("clerk_user_id, product_name")
    .in("clerk_user_id", userIds.length ? userIds : ["__none__"]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"]));

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">AI Usage Logs</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Token consumption, cost estimates, and per-endpoint analytics.
          <span className="ml-2 text-zinc-700 text-xs">claude-sonnet-4-6 · $3/M input · $15/M output</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today", ...day },
          { label: "This week", ...week },
          { label: "This month", ...month },
        ].map(({ label, calls, inTokens, outTokens, cost, errors }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{calls.toLocaleString()}<span className="text-sm font-normal text-zinc-600 ml-1">calls</span></p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Input tokens</span>
                <span className="text-zinc-400 tabular-nums">{(inTokens / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Output tokens</span>
                <span className="text-zinc-400 tabular-nums">{(outTokens / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                <span className="text-zinc-500 font-medium">Est. cost</span>
                <span className="text-white font-mono font-medium">{formatCost(cost)}</span>
              </div>
              {errors > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-500">Errors</span>
                  <span className="text-red-400 tabular-nums">{errors}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Endpoint breakdown */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Last 30 days by endpoint</p>
        <div className="grid grid-cols-4 gap-2">
          {endpoints.map((ep) => (
            <div key={ep} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-xs font-mono text-zinc-400">{ep}</p>
              <p className="text-lg font-bold tabular-nums mt-1">{epMap[ep].calls}</p>
              {epMap[ep].errors > 0 && (
                <p className="text-[10px] text-red-400">{epMap[ep].errors} errors</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Log table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            Recent calls · {count ?? 0} total
          </p>
          {/* Endpoint filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {["all", ...endpoints].map((ep) => (
              <Link
                key={ep}
                href={`/admin/ai-logs?endpoint=${ep}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  epFilter === ep ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                {ep}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Endpoint</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">In tokens</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Out tokens</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Cost</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Duration</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">When</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-600 text-sm">No AI logs yet.</td></tr>
              )}
              {(logs ?? []).map((log) => {
                const inT = log.prompt_tokens ?? 0;
                const outT = log.completion_tokens ?? 0;
                const cost = costUSD(inT, outT);
                return (
                  <tr key={log.id} className={`border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors ${!log.success ? "bg-red-950/10" : ""}`}>
                    <td className="px-4 py-3 text-zinc-300 text-sm">{nameMap.get(log.clerk_user_id) ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">{log.endpoint}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400 text-xs">{inT.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400 text-xs">{outT.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400 text-xs font-mono">{formatCost(cost)}</td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-600">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="text-[10px] text-emerald-400">ok</span>
                      ) : (
                        <span className="text-[10px] text-red-400" title={log.error ?? undefined}>✕ error</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-600">{timeAgo(log.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Link href={`/admin/ai-logs?endpoint=${epFilter}&page=${page - 1}`} className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white transition-colors ${page <= 1 ? "pointer-events-none opacity-30" : ""}`}>← Prev</Link>
            <span className="text-xs text-zinc-600">Page {page} of {totalPages}</span>
            <Link href={`/admin/ai-logs?endpoint=${epFilter}&page=${page + 1}`} className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white transition-colors ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`}>Next →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
