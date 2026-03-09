"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/github/event-card";
import { CommitRow } from "@/components/github/commit-row";
import {
  Github,
  GitCommit,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
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

interface Repo {
  full_name: string;
  description: string | null;
  private: boolean;
}

interface Connection {
  repo_full_name: string | null;
  access_token?: string;
  default_branch?: string | null;
}

interface GitHubDashboardProps {
  connection: Connection | null;
  initialEvents: DBMarketingEvent[];
  initialCommits: DBCommit[];
  lastSyncedAt: string | null;
}

function RepoSetup({ onRepoSaved }: { onRepoSaved: (repo: string) => void }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((d: { error?: string; repos?: Repo[] }) => {
        if (d.error) throw new Error(d.error);
        setRepos(d.repos ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/github/connect-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: selected, autoGenerate: true, autoSchedule: false }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(`Webhook installed on ${selected}`);
      onRepoSaved(selected);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 px-5 py-6">
        <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading your repositories…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-sm font-medium text-red-400">Could not load repositories</p>
        </div>
        <p className="text-xs text-zinc-500">{error}</p>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:text-white"
          onClick={() => { window.location.href = "/api/auth/github"; }}
        >
          Reconnect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800">
      <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800 rounded-t-2xl flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <p className="text-sm font-semibold text-white">
          GitHub connected — pick a repository to watch
        </p>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-zinc-500">
          Shipcast installs a webhook on the repo and surfaces marketable commits automatically.
        </p>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-left hover:border-zinc-500 transition-colors"
          >
            <span className={selected ? "text-white" : "text-zinc-500"}>
              {selected ||
                (repos.length > 0
                  ? `Choose from ${repos.length} repositor${repos.length === 1 ? "y" : "ies"}…`
                  : "No repositories found")}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && repos.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => { setSelected(repo.full_name); setOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white font-medium">{repo.full_name}</span>
                    {repo.private && (
                      <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600 text-[10px] shrink-0">
                        Private
                      </Badge>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{repo.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={save}
          disabled={!selected || saving}
          className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Installing webhook…</>
          ) : (
            <><Github className="h-4 w-4 mr-2" />Watch this repo</>
          )}
        </Button>
      </div>
    </div>
  );
}

function GitHubDashboardInner({
  connection,
  initialEvents,
  initialCommits,
  lastSyncedAt,
}: GitHubDashboardProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<DBMarketingEvent[]>(initialEvents);
  const [commits, setCommits] = useState<DBCommit[]>(initialCommits);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(lastSyncedAt);
  const [repoFullName, setRepoFullName] = useState<string | null>(
    connection?.repo_full_name ?? null
  );

  useEffect(() => {
    if (searchParams.get("connected")) {
      toast.success("GitHub connected! Pick a repo to start tracking commits.");
    }
    if (searchParams.get("error") === "denied") toast.error("GitHub connection cancelled.");
  }, [searchParams]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/github/sync", { method: "POST" });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        commits_new?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(
        (data.commits_new ?? 0) > 0
          ? `Synced ${data.commits_new} new commit${data.commits_new === 1 ? "" : "s"}`
          : "Already up to date"
      );
      setLastSynced(new Date().toISOString());
      const [eventsRes, commitsRes] = await Promise.all([
        fetch("/api/integrations/github/events?status=needs_review&limit=20"),
        fetch("/api/integrations/github/commits"),
      ]);
      const [eventsData, commitsData] = await Promise.all([
        eventsRes.json().catch(() => ({ events: [] })) as Promise<{ events?: DBMarketingEvent[] }>,
        commitsRes.json().catch(() => ({ commits: [] })) as Promise<{ commits?: DBCommit[] }>,
      ]);
      setEvents(eventsData.events ?? []);
      setCommits(commitsData.commits ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  // Not connected
  if (!connection) {
    return (
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">Connect GitHub</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {[
              "Watches your repo for meaningful commits",
              "Scores each push for marketing potential automatically",
              "One click to generate a tweet, thread, or LinkedIn post",
            ].map((line) => (
              <div key={line} className="flex gap-2 text-sm">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-400">{line}</span>
              </div>
            ))}
          </div>
          <Button
            className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
            onClick={() => { window.location.href = "/api/auth/github"; }}
          >
            <Github className="h-4 w-4 mr-2" />Connect GitHub
          </Button>
        </div>
      </div>
    );
  }

  // Connected but no repo
  if (!repoFullName) {
    return <RepoSetup onRepoSaved={setRepoFullName} />;
  }

  // Full dashboard
  const visibleEvents = events.filter((e) => e.status !== "dismissed");

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">
              Watching <span className="text-zinc-300">{repoFullName}</span>
            </p>
            {lastSynced && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Last synced {timeAgo(lastSynced)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs"
          >
            {syncing ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync now</>
            )}
          </Button>
          <button
            onClick={() => { window.location.href = "/api/auth/github"; }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Change
          </button>
        </div>
      </div>

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
            {commits.length > 0 && (
              <span className="ml-2 text-zinc-600 text-xs">{commits.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs_review" className="mt-4">
          {visibleEvents.length === 0 ? (
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-6">
              <CheckCircle2 className="h-5 w-5 text-zinc-600 shrink-0" />
              <div>
                <p className="text-sm text-zinc-400">No events to review yet.</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Push commits to{" "}
                  <span className="text-zinc-400">{repoFullName}</span> or{" "}
                  <button
                    onClick={handleSync}
                    className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
                  >
                    sync now
                  </button>{" "}
                  to detect existing ones.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all_activity" className="mt-4">
          {commits.length === 0 ? (
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-6">
              <GitCommit className="h-5 w-5 text-zinc-600 shrink-0" />
              <div>
                <p className="text-sm text-zinc-400">No commits tracked yet.</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  <button
                    onClick={handleSync}
                    className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
                  >
                    Sync now
                  </button>{" "}
                  to pull in recent commits, or push to your repo.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
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

export function GitHubDashboard(props: GitHubDashboardProps) {
  return (
    <Suspense>
      <GitHubDashboardInner {...props} />
    </Suspense>
  );
}
