import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  Users,
  FileText,
  CalendarClock,
  Github,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
        <Icon className={`h-4 w-4 ${accent ?? "text-zinc-600"}`} />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function PlanBar({
  plan,
  count,
  total,
  color,
}: {
  plan: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 capitalize font-medium">{plan}</span>
        <span className="text-zinc-500 tabular-nums">
          {count} <span className="text-zinc-700">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: newUsersMonth },
    { count: totalUpdates },
    { count: updatesWeek },
    { count: totalContent },
    { data: allSubs },
    { data: allPosts },
    { count: githubConnections },
    { count: activeRepos },
    { count: webhooks24h },
    { count: webhookErrors24h },
    { data: recentSyncRuns },
    { count: eventCandidates },
    { count: pendingEvents },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    supabaseAdmin.from("updates").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("updates").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabaseAdmin.from("generated_content").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("subscriptions").select("plan, status"),
    supabaseAdmin.from("scheduled_posts").select("status"),
    supabaseAdmin.from("github_connections").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("github_repositories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("webhook_deliveries").select("*", { count: "exact", head: true }).gte("created_at", dayAgo),
    supabaseAdmin.from("webhook_deliveries").select("*", { count: "exact", head: true }).gte("created_at", dayAgo).not("error", "is", null),
    supabaseAdmin.from("sync_runs").select("status, commits_found, commits_new, started_at").order("started_at", { ascending: false }).limit(5),
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
  ]);

  // Plan breakdown
  const planMap: Record<string, number> = { free: 0, pro: 0, studio: 0 };
  for (const sub of allSubs ?? []) {
    const p = (sub as { plan: string }).plan ?? "free";
    planMap[p] = (planMap[p] ?? 0) + 1;
  }
  const activeSubs = (allSubs ?? []).filter(
    (s) => (s as { status: string }).status === "active"
  ).length;

  // Post stats
  const postMap: Record<string, number> = { pending: 0, posted: 0, failed: 0 };
  for (const p of allPosts ?? []) {
    const st = (p as { status: string }).status ?? "pending";
    postMap[st] = (postMap[st] ?? 0) + 1;
  }
  const totalPosts = Object.values(postMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Users */}
      <section>
        <SectionHeader title="Users" sub="Registered accounts" />
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totalUsers ?? 0} icon={Users} accent="text-blue-400" />
          <StatCard label="New (7d)" value={newUsersWeek ?? 0} sub={`${newUsersMonth ?? 0} in last 30d`} icon={TrendingUp} accent="text-emerald-400" />
          <StatCard label="Active Subs" value={activeSubs} sub="paid + active" icon={CheckCircle2} accent="text-emerald-400" />
          <StatCard label="Free Users" value={planMap.free} sub={`${totalUsers ? Math.round((planMap.free / totalUsers) * 100) : 0}% of total`} icon={Users} />
        </div>
      </section>

      {/* Plan Distribution */}
      <section>
        <SectionHeader title="Plan Distribution" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm space-y-4">
          <PlanBar plan="free" count={planMap.free} total={totalUsers ?? 1} color="bg-zinc-500" />
          <PlanBar plan="pro" count={planMap.pro} total={totalUsers ?? 1} color="bg-blue-500" />
          <PlanBar plan="studio" count={planMap.studio} total={totalUsers ?? 1} color="bg-violet-500" />
        </div>
      </section>

      {/* Content */}
      <section>
        <SectionHeader title="Content" sub="Updates and AI-generated output" />
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Updates" value={totalUpdates ?? 0} sub={`${updatesWeek ?? 0} this week`} icon={FileText} accent="text-amber-400" />
          <StatCard label="Generated Pieces" value={totalContent ?? 0} icon={Zap} accent="text-violet-400" />
          <StatCard
            label="Avg pieces / update"
            value={
              totalUpdates && totalContent
                ? (totalContent / totalUpdates).toFixed(1)
                : "—"
            }
            icon={Activity}
          />
        </div>
      </section>

      {/* Scheduled Posts */}
      <section>
        <SectionHeader title="Scheduled Posts" sub="All users combined" />
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={totalPosts} icon={CalendarClock} />
          <StatCard label="Pending" value={postMap.pending} icon={Clock} accent="text-yellow-400" />
          <StatCard label="Posted" value={postMap.posted} icon={CheckCircle2} accent="text-emerald-400" />
          <StatCard label="Failed" value={postMap.failed} icon={AlertTriangle} accent="text-red-400" />
        </div>
      </section>

      {/* GitHub */}
      <section>
        <SectionHeader title="GitHub Integration" />
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Connections" value={githubConnections ?? 0} icon={Github} accent="text-zinc-400" />
          <StatCard label="Active Repos" value={activeRepos ?? 0} icon={Github} accent="text-emerald-400" />
          <StatCard label="Event Candidates" value={eventCandidates ?? 0} sub={`${pendingEvents ?? 0} needs review`} icon={Zap} accent="text-amber-400" />
          <StatCard
            label="Webhooks (24h)"
            value={webhooks24h ?? 0}
            sub={`${webhookErrors24h ?? 0} errors`}
            icon={(webhookErrors24h ?? 0) > 0 ? AlertTriangle : CheckCircle2}
            accent={(webhookErrors24h ?? 0) > 0 ? "text-red-400" : "text-emerald-400"}
          />
        </div>
      </section>

      {/* Recent Sync Runs */}
      {(recentSyncRuns ?? []).length > 0 && (
        <section>
          <SectionHeader title="Recent Sync Runs" sub="Last 5 GitHub sync operations" />
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Repo</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Found</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">New</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Started</th>
                </tr>
              </thead>
              <tbody>
                {(recentSyncRuns as Array<{
                  status: string;
                  commits_found: number;
                  commits_new: number;
                  started_at: string;
                }>).map((run, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">—</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        run.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : run.status === "running"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">{run.commits_found}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">{run.commits_new}</td>
                    <td className="px-4 py-3 text-right text-zinc-600 text-xs">
                      {new Date(run.started_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
