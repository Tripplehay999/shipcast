import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GitHubDashboard } from "@/components/github/github-dashboard";
import { Github } from "lucide-react";
import type { DBMarketingEvent, DBCommit } from "@/lib/github/types";

export default async function GitHubPage() {
  const { userId } = await auth();

  const [
    { data: conn },
    { data: notifications },
    { data: events },
    { data: commits },
    { data: repoMeta },
  ] = await Promise.all([
    supabaseAdmin
      .from("github_connections")
      .select("repo_full_name, auto_generate, auto_schedule, created_at, access_token, default_branch")
      .eq("clerk_user_id", userId!)
      .single(),
    supabaseAdmin
      .from("github_notifications")
      .select("*")
      .eq("clerk_user_id", userId!)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("marketing_event_candidates")
      .select("*, commit:github_commits(*)")
      .eq("clerk_user_id", userId!)
      .eq("status", "needs_review")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("github_commits")
      .select("*")
      .eq("clerk_user_id", userId!)
      .order("committed_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("github_repositories")
      .select("last_synced_at")
      .eq("clerk_user_id", userId!)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const lastSyncedAt = repoMeta?.last_synced_at ?? null;

  // Shape connection for GitHubDashboard — strip fields not needed in client
  const dashboardConn = conn
    ? {
        repo_full_name: conn.repo_full_name,
        access_token: conn.access_token,
        default_branch: conn.default_branch ?? null,
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Github className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">GitHub Integration</h1>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Shipcast watches your commits and surfaces marketable moments — so you never miss a launch
          opportunity.
        </p>
      </div>

      {/* Main dashboard */}
      <GitHubDashboard
        connection={dashboardConn}
        initialEvents={(events ?? []) as DBMarketingEvent[]}
        initialCommits={(commits ?? []) as DBCommit[]}
        lastSyncedAt={lastSyncedAt}
      />

    </div>
  );
}
