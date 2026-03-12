import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { Github, GitMerge, Sparkles, Clock } from "lucide-react";
import { AutomationClient } from "@/components/automation/automation-client";
import { GitHubDashboard } from "@/components/github/github-dashboard";
import type { DBMarketingEvent, DBCommit } from "@/lib/github/types";

export default async function AutomationPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [
    { data: conn },
    { data: pendingGroups },
    { data: draftAnnouncements },
    { count: totalAnnounced },
    { count: totalCommits },
    eventsResult,
    commitsResult,
  ] = await Promise.allSettled([
    supabaseAdmin
      .from("github_connections")
      .select("repo_full_name, access_token")
      .eq("clerk_user_id", userId)
      .single(),
    supabaseAdmin
      .from("commit_groups")
      .select("*")
      .eq("clerk_user_id", userId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("announcement_objects")
      .select("*, content_scores (format, score, hook_strength, clarity, benefit_emphasis, novelty, feedback, needs_regeneration)")
      .eq("clerk_user_id", userId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("announcement_objects")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId)
      .eq("status", "published"),
    supabaseAdmin
      .from("github_commits")
      .select("*", { count: "exact", head: true })
      .eq("clerk_user_id", userId),
    supabaseAdmin
      .from("marketing_event_candidates")
      .select("*, commit:github_commits(*)")
      .eq("clerk_user_id", userId)
      .eq("status", "needs_review")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("github_commits")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("committed_at", { ascending: false })
      .limit(50),
  ]).then((results) => results.map((r) => (r.status === "fulfilled" ? r.value : { data: null, count: null }))) as [
    { data: { repo_full_name: string | null; access_token: string } | null },
    { data: Record<string, unknown>[] | null },
    { data: Record<string, unknown>[] | null },
    { count: number | null },
    { count: number | null },
    { data: DBMarketingEvent[] | null },
    { data: DBCommit[] | null },
  ];

  const isConnected = !!conn?.repo_full_name;
  const repoName = conn?.repo_full_name ?? null;
  const hasPending = (pendingGroups ?? []).length > 0 || (draftAnnouncements ?? []).length > 0;
  const dashboardConn = conn ? { repo_full_name: conn.repo_full_name ?? null, access_token: conn.access_token } : null;
  const events = eventsResult?.data ?? [];
  const commits = commitsResult?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <GitMerge className="h-5 w-5 text-white" />
            <h1 className="text-2xl font-bold">Automation</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Shipcast watches your commits, detects marketable moments, and drafts content — you just review and approve.
          </p>
        </div>

        {/* Connection status pill */}
        {isConnected ? (
          <div className="shrink-0 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium truncate max-w-[160px]">{repoName}</span>
          </div>
        ) : (
          <Link
            href="/github"
            className="shrink-0 flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full px-3 py-1.5 transition-colors"
          >
            <Github className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-300">Connect GitHub</span>
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Commits tracked", value: totalCommits ?? 0, icon: GitMerge },
          { label: "Awaiting review", value: (pendingGroups ?? []).length + (draftAnnouncements ?? []).length, icon: Clock },
          { label: "Published", value: totalAnnounced ?? 0, icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-zinc-500" />
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline steps */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">How it works</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {[
            { step: "Push commits", desc: "to your repo" },
            null,
            { step: "Shipcast detects", desc: "marketable changes" },
            null,
            { step: "AI drafts content", desc: "tweet, LinkedIn, more" },
            null,
            { step: "You review", desc: "approve or reject", highlight: true },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="hidden sm:flex items-center justify-center">
                <span className="text-zinc-700 text-lg">→</span>
              </div>
            ) : (
              <div key={i} className={`rounded-lg px-3 py-2.5 border ${item.highlight ? "border-white/10 bg-white/5" : "border-zinc-800 bg-zinc-950"}`}>
                <p className={`text-xs font-medium ${item.highlight ? "text-white" : "text-zinc-300"}`}>{item.step}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{item.desc}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Commit feed — GitHubDashboard handles all its own states */}
      <GitHubDashboard
        connection={dashboardConn}
        initialEvents={events}
        initialCommits={commits}
        lastSyncedAt={null}
      />

      {/* Review queue — only shown when there are pending items */}
      {hasPending && (
        <AutomationClient
          initialGroups={pendingGroups ?? []}
          initialAnnouncements={(draftAnnouncements ?? []) as Record<string, unknown>[]}
        />
      )}
    </div>
  );
}
