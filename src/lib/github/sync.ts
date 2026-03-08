import { supabaseAdmin } from "@/lib/supabase";
import { normalizeCommit } from "./classify";
import { extractMarketingSignal } from "./extract-signals";

interface SyncResult {
  commits_found: number;
  commits_new: number;
  error?: string;
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}

export async function syncRepoCommits(
  clerkUserId: string,
  repoFullName: string,
  accessToken: string,
  branch = "main"
): Promise<SyncResult> {
  // Start a sync_run record
  const { data: syncRun } = await supabaseAdmin
    .from("sync_runs")
    .insert({
      clerk_user_id: clerkUserId,
      repo_full_name: repoFullName,
      status: "running",
    })
    .select("id")
    .single();

  const syncRunId = syncRun?.id;

  try {
    // Fetch last 30 commits from GitHub REST API
    const apiUrl = `https://api.github.com/repos/${repoFullName}/commits?sha=${branch}&per_page=30`;
    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text().catch(() => String(ghRes.status));
      throw new Error(`GitHub API error: ${ghRes.status} ${errText}`);
    }

    const rawCommits: GitHubCommitResponse[] = await ghRes.json();
    const commitsFound = rawCommits.length;
    let commitsNew = 0;

    // Get existing SHAs for this repo to deduplicate
    const { data: existingShas } = await supabaseAdmin
      .from("github_commits")
      .select("sha")
      .eq("repo_full_name", repoFullName)
      .in(
        "sha",
        rawCommits.map((c) => c.sha)
      );

    const existingShaSet = new Set((existingShas ?? []).map((r) => r.sha));

    const newCommits = rawCommits.filter((c) => !existingShaSet.has(c.sha));

    for (const raw of newCommits) {
      const normalized = normalizeCommit({
        sha: raw.sha,
        message: raw.commit.message,
        author: {
          name: raw.commit.author.name,
          email: raw.commit.author.email,
        },
        committed_at: raw.commit.author.date,
        repo: repoFullName,
        branch,
        source: "sync",
      });

      // Insert commit
      const { data: insertedCommit, error: insertError } = await supabaseAdmin
        .from("github_commits")
        .insert({
          clerk_user_id: clerkUserId,
          repo_full_name: repoFullName,
          sha: normalized.sha,
          message: normalized.message,
          title: normalized.title,
          body: normalized.body,
          author_name: normalized.author_name,
          author_email: normalized.author_email,
          committed_at: normalized.committed_at,
          branch: normalized.branch,
          commit_type: normalized.commit_type,
          is_marketable: normalized.is_marketable,
          marketing_score: normalized.marketing_score,
          detected_keywords: normalized.detected_keywords,
          status: "pending",
          source: normalized.source,
        })
        .select("id")
        .single();

      if (insertError) {
        // 23505 = unique_violation — already exists, skip
        if (insertError.code === "23505") continue;
        console.error("[sync] Insert commit error:", insertError.message);
        continue;
      }

      commitsNew++;

      // Create marketing event candidate for marketable commits
      if (normalized.is_marketable && insertedCommit) {
        const signal = extractMarketingSignal(
          { ...normalized, id: insertedCommit.id },
          clerkUserId
        );

        const { error: eventError } = await supabaseAdmin
          .from("marketing_event_candidates")
          .insert(signal);

        if (eventError) {
          console.error("[sync] Insert event error:", eventError.message);
        }
      }
    }

    // Update last_synced_at in github_repositories
    await supabaseAdmin
      .from("github_repositories")
      .upsert(
        {
          clerk_user_id: clerkUserId,
          repo_full_name: repoFullName,
          owner: repoFullName.split("/")[0],
          name: repoFullName.split("/")[1],
          default_branch: branch,
          last_synced_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "clerk_user_id,repo_full_name" }
      );

    // Complete the sync run
    if (syncRunId) {
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "completed",
          commits_found: commitsFound,
          commits_new: commitsNew,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncRunId);
    }

    return { commits_found: commitsFound, commits_new: commitsNew };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown sync error";

    if (syncRunId) {
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "failed",
          error: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncRunId);
    }

    return { commits_found: 0, commits_new: 0, error: errorMsg };
  }
}
