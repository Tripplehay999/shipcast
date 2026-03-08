"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/github/event-card";
import { CommitRow } from "@/components/github/commit-row";
import { GitCommit, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { DBMarketingEvent, DBCommit } from "@/lib/github/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Connection {
  repo_full_name: string | null;
  access_token: string;
  default_branch?: string | null;
}

interface GitHubDashboardProps {
  connection: Connection | null;
  initialEvents: DBMarketingEvent[];
  initialCommits: DBCommit[];
  lastSyncedAt: string | null;
}

export function GitHubDashboard({
  connection,
  initialEvents,
  initialCommits,
  lastSyncedAt,
}: GitHubDashboardProps) {
  const [events, setEvents] = useState<DBMarketingEvent[]>(initialEvents);
  const [commits, setCommits] = useState<DBCommit[]>(initialCommits);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(lastSyncedAt);

  const isConnected = !!connection;
  const hasRepo = !!connection?.repo_full_name;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/github/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Sync failed");

      const result = data as { commits_found: number; commits_new: number };
      toast.success(
        result.commits_new > 0
          ? `Synced ${result.commits_new} new commit${result.commits_new > 1 ? "s" : ""}`
          : "Already up to date"
      );

      setLastSynced(new Date().toISOString());

      // Refresh events and commits
      const [eventsRes, commitsRes] = await Promise.all([
        fetch("/api/integrations/github/events?status=needs_review&limit=20"),
        fetch("/api/integrations/github/commits"),
      ]);
      const [eventsData, commitsData] = await Promise.all([
        eventsRes.json().catch(() => ({ events: [] })),
        commitsRes.json().catch(() => ({ commits: [] })),
      ]);
      setEvents((eventsData as { events: DBMarketingEvent[] }).events ?? []);
      setCommits((commitsData as { commits: DBCommit[] }).commits ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
  };

  const visibleEvents = events.filter((e) => e.status !== "dismissed");

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-white">GitHub not connected</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Connect your GitHub account in the settings below to start tracking commits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top banner */}
      {hasRepo ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">
                Watching{" "}
                <span className="text-zinc-300">{connection.repo_full_name}</span>
              </p>
              {lastSynced && (
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Last synced {timeAgo(lastSynced)}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="shrink-0 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs"
          >
            {syncing ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync now</>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm text-zinc-400">
            No repository selected. Choose one in the settings below to begin tracking commits.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="needs_review">
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
          <TabsTrigger
            value="needs_review"
            className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 text-sm"
          >
            Needs Review
            {visibleEvents.length > 0 && (
              <span className="ml-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-white text-black text-[10px] font-bold">
                {visibleEvents.length > 9 ? "9+" : visibleEvents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="all_activity"
            className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 text-sm"
          >
            All Activity
          </TabsTrigger>
        </TabsList>

        {/* Needs Review tab */}
        <TabsContent value="needs_review" className="mt-4 space-y-3">
          {visibleEvents.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6">
              <CheckCircle2 className="h-5 w-5 text-zinc-600 shrink-0" />
              <div>
                <p className="text-sm text-zinc-400">No events to review.</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Push marketable commits or click &ldquo;Sync now&rdquo; to detect existing ones.
                </p>
              </div>
            </div>
          ) : (
            visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </TabsContent>

        {/* All Activity tab */}
        <TabsContent value="all_activity" className="mt-4">
          {commits.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6">
              <GitCommit className="h-5 w-5 text-zinc-600 shrink-0" />
              <div>
                <p className="text-sm text-zinc-400">No commits tracked yet.</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Sync your repo or push commits to see activity here.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-2xl overflow-hidden">
              {commits.map((commit) => (
                <CommitRow key={commit.id} commit={commit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
