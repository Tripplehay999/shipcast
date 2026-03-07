"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Github,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Zap,
  Webhook,
  AlertCircle,
  GitCommit,
  Sparkles,
  CalendarClock,
  ImageIcon,
  X,
} from "lucide-react";

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
}

interface Notification {
  id: string;
  repo_full_name: string;
  commit_messages: string[];
  summary: string;
  created_at: string;
  status: string;
}

interface NotifCardState {
  generating: boolean;
  tweet: string | null;
  linkedin: string | null;
  queued: boolean;
  dismissed: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationCard({ notif, onDone }: { notif: Notification; onDone: (id: string) => void }) {
  const [state, setState] = useState<NotifCardState>({
    generating: false,
    tweet: null,
    linkedin: null,
    queued: false,
    dismissed: false,
  });

  const generate = async () => {
    setState((s) => ({ ...s, generating: true }));
    try {
      const res = await fetch("/api/github/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setState((s) => ({ ...s, generating: false, tweet: data.tweet, linkedin: data.linkedin, queued: true }));
    } catch (err: unknown) {
      setState((s) => ({ ...s, generating: false }));
      toast.error(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const dismiss = async () => {
    setState((s) => ({ ...s, dismissed: true }));
    await fetch("/api/github/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: notif.id }),
    });
    onDone(notif.id);
  };

  if (state.dismissed) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">{notif.repo_full_name} · {timeAgo(notif.created_at)}</p>
            <p className="text-sm font-medium text-white leading-snug mt-0.5">{notif.summary}</p>
          </div>
        </div>
        {!state.queued && (
          <button
            onClick={dismiss}
            className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Commits list */}
      {notif.commit_messages.length > 1 && (
        <div className="px-5 py-3 border-b border-zinc-800/60 space-y-1">
          {notif.commit_messages.map((msg, i) => (
            <p key={i} className="text-xs text-zinc-500 flex gap-2">
              <span className="text-zinc-700">—</span>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Generated tweet */}
      {state.tweet && (
        <div className="px-5 py-4 space-y-3 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Generated tweet</p>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{state.tweet}</p>
          </div>

          {/* Image generation coming soon */}
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-700 px-4 py-3 bg-zinc-900/40">
            <ImageIcon className="h-4 w-4 text-zinc-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400 font-medium">Image generation</span> — coming soon. AI-crafted visuals for every post.
              </p>
            </div>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] shrink-0">Soon</Badge>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="px-5 py-4">
        {state.queued ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">Post added to queue</p>
            </div>
            <Link
              href="/schedule"
              className="text-sm text-white underline underline-offset-2 hover:text-zinc-300 transition-colors"
            >
              View in Post Queue →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={generate}
              disabled={state.generating}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-semibold h-10"
            >
              {state.generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Post</>
              )}
            </Button>
            <button
              onClick={dismiss}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GitHubInner({
  connection,
  initialNotifications,
}: {
  connection: Connection | null;
  initialNotifications: Notification[];
}) {
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(connection?.repo_full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [showRepoList, setShowRepoList] = useState(false);
  const [showSettings, setShowSettings] = useState(!connection?.repo_full_name);

  useEffect(() => {
    if (searchParams.get("connected")) toast.success("GitHub connected! Now select a repo to watch.");
    if (searchParams.get("error") === "denied") toast.error("GitHub connection was cancelled.");
    if (searchParams.get("error") === "invalid_state") toast.error("Session expired. Try again.");
  }, [searchParams]);

  useEffect(() => {
    if (connection) loadRepos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        body: JSON.stringify({ repoFullName: selectedRepo, autoGenerate: true, autoSchedule: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(`Webhook installed on ${selectedRepo}. Push a feat: or fix: commit to test.`);
      setShowSettings(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!connection) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
            <p className="text-sm font-semibold text-white">How it works</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              ["Connect your GitHub account", "One-click OAuth — we only read your repos"],
              ["Pick a repository to watch", "We install a webhook on that repo"],
              ["Push a feat: or fix: commit", "A notification appears here — you choose whether to post"],
              ["Generate & queue in one click", "AI writes the tweet. It lands in your Post Queue for tomorrow 9am"],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                <div className="text-sm">
                  <span className="text-white font-medium">{title}</span>
                  <span className="text-zinc-600"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500 mb-2 font-medium">Commit prefixes that trigger notifications</p>
              <div className="flex gap-2 flex-wrap">
                {["feat:", "fix:", "perf:", "launch:", "release:"].map((p) => (
                  <code key={p} className="text-xs bg-zinc-800 text-emerald-400 px-2 py-0.5 rounded border border-zinc-700">{p}</code>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-2">chore:, ci:, docs:, style: are ignored.</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
          onClick={() => { window.location.href = "/api/auth/github"; }}
        >
          <Github className="h-4 w-4 mr-2" />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected + repo status */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">GitHub connected</span>
        </div>
        <button
          onClick={() => { window.location.href = "/api/auth/github"; }}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Reconnect
        </button>
      </div>

      {/* Pending notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-white" />
            <p className="text-sm font-semibold text-white">
              {notifications.length} new commit{notifications.length > 1 ? "s" : ""} detected
            </p>
            <Badge className="bg-white text-black text-[10px] font-bold px-2">
              {notifications.length}
            </Badge>
          </div>
          {notifications.map((n) => (
            <NotificationCard key={n.id} notif={n} onDone={removeNotification} />
          ))}
        </div>
      )}

      {/* No pending — empty state if repo is set */}
      {notifications.length === 0 && connection.repo_full_name && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4">
          <GitCommit className="h-4 w-4 text-zinc-600 shrink-0" />
          <div>
            <p className="text-sm text-zinc-400">No pending commits.</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Push a <code className="text-zinc-500">feat:</code> or <code className="text-zinc-500">fix:</code> commit to <span className="text-zinc-400">{connection.repo_full_name}</span> and a prompt will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Settings section */}
      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900/60 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-2 text-left">
            <Webhook className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                {connection.repo_full_name ? "Webhook settings" : "Set up webhook"}
              </p>
              {connection.repo_full_name && (
                <p className="text-xs text-zinc-500 mt-0.5">{connection.repo_full_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection.repo_full_name && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>
            )}
            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${showSettings ? "rotate-180" : ""}`} />
          </div>
        </button>

        {(!connection.repo_full_name || showSettings) && (
          <div className="p-4 space-y-4 border-t border-zinc-800">
            {!connection.repo_full_name && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-sm text-zinc-400">
                  Select a repo and click <span className="text-white font-medium">Save & install webhook</span> to start.
                </p>
              </div>
            )}

            {/* Repo dropdown */}
            <div>
              <p className="text-xs text-zinc-500 mb-2 font-medium">Repository to watch</p>
              <div className="relative">
                <button
                  onClick={() => setShowRepoList(!showRepoList)}
                  className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-left hover:border-zinc-600 transition-colors"
                >
                  <span className={selectedRepo ? "text-white" : "text-zinc-500"}>
                    {selectedRepo || "Select a repository…"}
                  </span>
                  {loadingRepos
                    ? <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                    : <ChevronDown className="h-4 w-4 text-zinc-500" />
                  }
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

            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <CalendarClock className="h-4 w-4 text-purple-400 shrink-0" />
              <p className="text-xs text-zinc-500">
                Generated posts are scheduled for <span className="text-zinc-300">tomorrow at 9am</span> in your Post Queue.
              </p>
            </div>

            <Button
              onClick={saveRepo}
              disabled={saving || !selectedRepo}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Installing webhook…</>
                : <><Github className="h-4 w-4 mr-2" />{connection.repo_full_name ? "Update & reinstall webhook" : "Save & install webhook"}</>
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GitHubClient({
  connection,
  initialNotifications,
}: {
  connection: Connection | null;
  initialNotifications: Notification[];
}) {
  return (
    <Suspense>
      <GitHubInner connection={connection} initialNotifications={initialNotifications} />
    </Suspense>
  );
}
