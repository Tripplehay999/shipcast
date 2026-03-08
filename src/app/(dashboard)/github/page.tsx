import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GitHubDashboard } from "@/components/github/github-dashboard";
import { Github } from "lucide-react";
import type { DBMarketingEvent, DBCommit } from "@/lib/github/types";

export default async function GitHubPage() {
  const { userId } = await auth();

  // Only select columns guaranteed to exist in the original github_connections table.
  // Run each query independently so one failing table doesn't break the whole page.
  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("repo_full_name, access_token")
    .eq("clerk_user_id", userId!)
    .single();

  const [eventsResult, commitsResult] = await Promise.allSettled([
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
  ]);

  const events =
    eventsResult.status === "fulfilled" ? (eventsResult.value.data ?? []) : [];
  const commits =
    commitsResult.status === "fulfilled" ? (commitsResult.value.data ?? []) : [];

  const dashboardConn = conn
    ? { repo_full_name: conn.repo_full_name ?? null, access_token: conn.access_token }
    : null;

  return (
    <div className="max-w-2xl mx-auto">
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

      <GitHubDashboard
        connection={dashboardConn}
        initialEvents={events as DBMarketingEvent[]}
        initialCommits={commits as DBCommit[]}
        lastSyncedAt={null}
      />
    </div>
  );
}
