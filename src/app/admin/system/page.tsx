import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { PlanLimitsManager } from "@/components/admin/plan-limits-manager";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

// ENV vars we check (never show values — only presence/absence)
const ENV_KEYS = [
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", label: "Clerk Publishable Key",   secret: false },
  { key: "CLERK_SECRET_KEY",                  label: "Clerk Secret Key",         secret: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL",          label: "Supabase URL",             secret: false },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",     label: "Supabase Anon Key",        secret: false },
  { key: "SUPABASE_SERVICE_ROLE_KEY",         label: "Supabase Service Role",    secret: true },
  { key: "ANTHROPIC_API_KEY",                 label: "Anthropic API Key",        secret: true },
  { key: "STRIPE_SECRET_KEY",                 label: "Stripe Secret Key",        secret: true },
  { key: "STRIPE_WEBHOOK_SECRET",             label: "Stripe Webhook Secret",    secret: true },
  { key: "NEXT_PUBLIC_APP_URL",               label: "App URL",                  secret: false },
  { key: "ADMIN_USER_IDS",                    label: "Admin User IDs",           secret: false },
  { key: "GITHUB_CLIENT_ID",                  label: "GitHub OAuth Client ID",   secret: false },
  { key: "GITHUB_CLIENT_SECRET",              label: "GitHub OAuth Secret",      secret: true },
  { key: "TWITTER_CLIENT_ID",                 label: "Twitter Client ID",        secret: false },
  { key: "TWITTER_CLIENT_SECRET",             label: "Twitter Client Secret",    secret: true },
  { key: "LINKEDIN_CLIENT_ID",                label: "LinkedIn Client ID",       secret: false },
  { key: "LINKEDIN_CLIENT_SECRET",            label: "LinkedIn Client Secret",   secret: true },
];

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

export default async function AdminSystemPage() {
  await requireAdmin();

  // Check env var presence (server only)
  const envStatus = ENV_KEYS.map(({ key, label, secret }) => ({
    key,
    label,
    secret,
    set: Boolean(process.env[key]),
    value: !secret && process.env[key] ? process.env[key]! : null,
  }));

  const missingCount = envStatus.filter((e) => !e.set).length;

  // Plan limits
  const { data: planLimits } = await supabaseAdmin
    .from("plan_limits")
    .select("*")
    .order("plan", { ascending: true });

  // Scheduled cron info (last post cron run — look at recently posted)
  const { data: recentPosts } = await supabaseAdmin
    .from("scheduled_posts")
    .select("status, posted_at, error, scheduled_at")
    .order("scheduled_at", { ascending: false })
    .limit(5);

  // Failed posts in last 24h
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const [{ count: failedRecent }, { count: pendingOverdue }] = await Promise.all([
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true })
      .eq("status", "failed").gte("created_at", dayAgo),
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true })
      .eq("status", "pending").lt("scheduled_at", new Date().toISOString()),
  ]);

  // Webhook health
  const { count: recentWebhooks } = await supabaseAdmin
    .from("webhook_deliveries").select("*", { count: "exact", head: true }).gte("created_at", dayAgo);
  const { count: webhookErrors } = await supabaseAdmin
    .from("webhook_deliveries").select("*", { count: "exact", head: true })
    .gte("created_at", dayAgo).not("error", "is", null);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold">System Health</h1>
        <p className="text-zinc-500 text-sm mt-1">Environment variables, job queue, plan limits, and cron status.</p>
      </div>

      {/* Job Queue Health */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-4">Job Queue</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Failed posts (24h)", value: failedRecent ?? 0, warn: (failedRecent ?? 0) > 0 },
            { label: "Overdue pending posts", value: pendingOverdue ?? 0, warn: (pendingOverdue ?? 0) > 0 },
            { label: "Webhooks (24h)", value: recentWebhooks ?? 0, warn: false },
            { label: "Webhook errors (24h)", value: webhookErrors ?? 0, warn: (webhookErrors ?? 0) > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className={`border rounded-xl p-4 ${warn && value > 0 ? "bg-red-950/20 border-red-900/40" : "bg-zinc-900 border-zinc-800"}`}>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${warn && value > 0 ? "text-red-300" : ""}`}>{value}</p>
            </div>
          ))}
        </div>

        {(pendingOverdue ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendingOverdue} posts are past their scheduled time. Check that the cron job at <code className="text-xs bg-amber-900/30 px-1.5 py-0.5 rounded mx-1">/api/cron/post</code> is running.
          </div>
        )}
      </section>

      {/* Recent scheduled post activity */}
      {(recentPosts ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Recent Post Queue Activity</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
                  <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">Scheduled</th>
                  <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">Posted</th>
                  <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">Error</th>
                </tr>
              </thead>
              <tbody>
                {(recentPosts ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-2">
                      <span className={`text-[10px] border px-2 py-0.5 rounded-full ${
                        p.status === "posted" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : p.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{timeAgo(p.scheduled_at)}</td>
                    <td className="px-4 py-2 text-xs text-zinc-600">{p.posted_at ? timeAgo(p.posted_at) : "—"}</td>
                    <td className="px-4 py-2 text-xs text-red-400 max-w-xs truncate">{p.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Plan Limits */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-1">Plan Limits Configuration</h2>
        <p className="text-zinc-500 text-xs mb-4">Adjust limits without a code deploy. null = unlimited.</p>
        <PlanLimitsManager initialLimits={planLimits ?? []} />
      </section>

      {/* Environment Variables */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
          {missingCount > 0 ? (
            <span className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> {missingCount} not set
            </span>
          ) : (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> All configured
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-700 mb-3">
          ⓘ Secret key values are never shown — only presence/absence is indicated.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Variable</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Key</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Value</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {envStatus.map((e) => (
                <tr key={e.key} className={`border-b border-zinc-800/50 last:border-0 ${!e.set ? "bg-red-950/10" : ""}`}>
                  <td className="px-4 py-3 text-zinc-300 text-sm">{e.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{e.key}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.set ? (
                      e.value ? (
                        <span className="font-mono text-zinc-400 truncate max-w-xs block">{e.value}</span>
                      ) : (
                        <span className="text-zinc-700 font-mono">••••••••••••••</span>
                      )
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.set ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="h-3 w-3" /> missing
                      </span>
                    )}
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
