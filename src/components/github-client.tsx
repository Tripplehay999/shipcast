"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Github, CheckCircle2, Link2, Loader2, ChevronDown, Zap, CalendarClock } from "lucide-react";

interface Connection {
  repo_full_name: string | null;
  auto_generate: boolean;
  auto_schedule: boolean;
  created_at: string;
}

interface Repo {
  full_name: string;
  description: string | null;
  private: boolean;
  pushed_at: string;
}

function GitHubInner({ connection }: { connection: Connection | null }) {
  const searchParams = useSearchParams();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(connection?.repo_full_name ?? "");
  const [autoGenerate, setAutoGenerate] = useState(connection?.auto_generate ?? true);
  const [autoSchedule, setAutoSchedule] = useState(connection?.auto_schedule ?? false);
  const [saving, setSaving] = useState(false);
  const [showRepoList, setShowRepoList] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected")) toast.success("GitHub connected!");
    if (searchParams.get("error") === "denied") toast.error("GitHub connection was cancelled.");
    if (searchParams.get("error") === "invalid_state") toast.error("Session expired. Try again.");
  }, [searchParams]);

  useEffect(() => {
    if (connection) loadRepos();
  }, [connection]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setRepos(data.repos ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingRepos(false);
    }
  };

  const saveRepo = async () => {
    if (!selectedRepo) { toast.error("Select a repo first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/github/connect-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: selectedRepo, autoGenerate, autoSchedule }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(`Webhook installed on ${selectedRepo}. Push a feat: or fix: commit to test it.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!connection) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">How it works</p>
            <div className="space-y-2 text-sm text-zinc-400">
              {[
                ["Connect your GitHub account", "One-click OAuth — we only read your repos"],
                ["Pick a repository to watch", "We install a webhook on that repo"],
                ["Push a commit with feat: or fix:", "Shipcast detects it and generates content automatically"],
                ["Review in your History", "Content appears in your feed, ready to publish"],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <div>
                    <span className="text-white">{title}</span>
                    <span className="text-zinc-600"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-2 font-medium">Commit prefixes that trigger generation</p>
            <div className="flex gap-2 flex-wrap">
              {["feat:", "fix:", "perf:", "launch:", "release:"].map((p) => (
                <code key={p} className="text-xs bg-zinc-800 text-emerald-400 px-2 py-0.5 rounded border border-zinc-700">{p}</code>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-2">Commits starting with chore:, ci:, docs:, style: are ignored.</p>
          </div>
        </div>

        <Button
          className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
          onClick={() => window.location.href = "/api/auth/github"}
        >
          <Github className="h-4 w-4 mr-2" />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connected badge */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">GitHub connected</span>
        </div>
        <button
          onClick={() => window.location.href = "/api/auth/github"}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Reconnect
        </button>
      </div>

      {/* Repo selector */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-white">Repository to watch</p>
          <p className="text-xs text-zinc-500">
            Shipcast will install a webhook and listen for <code className="text-zinc-400 bg-zinc-800 px-1 rounded">feat:</code> / <code className="text-zinc-400 bg-zinc-800 px-1 rounded">fix:</code> commits on the main branch.
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowRepoList(!showRepoList)}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-left hover:border-zinc-600 transition-colors"
          >
            <span className={selectedRepo ? "text-white" : "text-zinc-500"}>
              {selectedRepo || "Select a repository…"}
            </span>
            {loadingRepos ? (
              <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          {showRepoList && repos.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => { setSelectedRepo(repo.full_name); setShowRepoList(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white font-medium">{repo.full_name}</span>
                    {repo.private && (
                      <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600 text-[10px]">Private</Badge>
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
      </div>

      {/* Settings */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Automation settings</p>
        <div className="space-y-2">
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-sky-400" />
              <div>
                <p className="text-sm font-medium text-white">Auto-generate content</p>
                <p className="text-xs text-zinc-500">Automatically create posts when you push qualifying commits</p>
              </div>
            </div>
            <div
              onClick={() => setAutoGenerate(!autoGenerate)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoGenerate ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoGenerate ? "left-5" : "left-0.5"}`} />
            </div>
          </label>

          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">Auto-schedule to Twitter</p>
                <p className="text-xs text-zinc-500">Automatically queue the tweet for the next open slot (Studio plan)</p>
              </div>
            </div>
            <div
              onClick={() => setAutoSchedule(!autoSchedule)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoSchedule ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoSchedule ? "left-5" : "left-0.5"}`} />
            </div>
          </label>
        </div>
      </div>

      {connection.repo_full_name && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-zinc-500" />
          <p className="text-sm text-zinc-400">Currently watching <span className="text-white font-medium">{connection.repo_full_name}</span></p>
        </div>
      )}

      <Button
        onClick={saveRepo}
        disabled={saving || !selectedRepo}
        className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Github className="h-4 w-4 mr-2" />}
        {connection.repo_full_name ? "Update settings" : "Start watching repo"}
      </Button>
    </div>
  );
}

export function GitHubClient({ connection }: { connection: Connection | null }) {
  return (
    <Suspense>
      <GitHubInner connection={connection} />
    </Suspense>
  );
}
