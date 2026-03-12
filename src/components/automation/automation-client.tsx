"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  GitCommit,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Star,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommitGroup {
  id: string;
  title: string;
  category: string;
  commit_ids: string[];
  detected_keywords: string[];
  signal_score: number;
  is_marketable: boolean;
  status: string;
  source: string;
  repo_full_name: string;
  created_at: string;
}

interface ContentScore {
  format: string;
  score: number;
  hook_strength: number;
  clarity: number;
  benefit_emphasis: number;
  novelty: number;
  feedback: string;
  needs_regeneration: boolean;
}

interface Announcement {
  id: string;
  feature_name: string;
  headline: string;
  summary: string;
  benefits: string[];
  story: string;
  cta: string;
  link: string;
  category: string;
  audience: string;
  avg_score: number | null;
  best_tweet_score: number | null;
  best_linkedin_score: number | null;
  content_generated: boolean;
  status: string;
  created_at: string;
  content_scores?: ContentScore[];
}

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  feature:     "bg-violet-500/10 text-violet-400 border-violet-500/20",
  improvement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  integration: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  performance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  bugfix:      "bg-red-500/10 text-red-400 border-red-500/20",
  release:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[category] ?? "bg-zinc-700 text-zinc-400 border-zinc-600"}`}>
      {category}
    </span>
  );
}

function SignalBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 tabular-nums">{pct}%</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[10px] text-zinc-700">—</span>;
  const color = score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-bold tabular-nums ${color}`}>{score}</span>;
}

// ─── Commit Group Card ────────────────────────────────────────────────────────

function CommitGroupCard({
  group,
  onRunPipeline,
  onIgnore,
}: {
  group: CommitGroup;
  onRunPipeline: (id: string) => Promise<void>;
  onIgnore: (id: string) => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [ignoring, setIgnoring] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <GitCommit className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{group.title}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{group.repo_full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <CategoryBadge category={group.category} />
          {group.source === "release" && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">release</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-600">
        <span>{group.commit_ids.length} commit{group.commit_ids.length !== 1 ? "s" : ""}</span>
        {group.detected_keywords.length > 0 && (
          <span className="text-zinc-700">{group.detected_keywords.slice(0, 3).join(" · ")}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 mb-1">Signal</p>
          <SignalBar score={group.signal_score} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => { setIgnoring(true); await onIgnore(group.id); setIgnoring(false); }}
            disabled={ignoring || running}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors disabled:opacity-40"
          >
            {ignoring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ignore"}
          </button>
          <button
            onClick={async () => { setRunning(true); await onRunPipeline(group.id); setRunning(false); }}
            disabled={running || ignoring}
            className="text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {running ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="h-3 w-3" />Generate Content</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  ann,
  onApprove,
  onReject,
}: {
  ann: Announcement;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const scores = ann.content_scores ?? [];
  const hasScores = scores.length > 0;
  const lowScores = scores.filter((s) => s.needs_regeneration);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={ann.category} />
              {ann.avg_score !== null && (
                <span className="text-[10px] text-zinc-600">avg score</span>
              )}
              <ScoreBadge score={ann.avg_score} />
            </div>
            <p className="text-white text-sm font-semibold">{ann.headline}</p>
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{ann.summary}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-1"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {lowScores.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-3">
            <AlertTriangle className="h-3 w-3" />
            {lowScores.length} format{lowScores.length > 1 ? "s" : ""} scored low — consider editing
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {[
              { label: "Tweet", score: ann.best_tweet_score },
              { label: "LinkedIn", score: ann.best_linkedin_score },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-600">{label}</span>
                <ScoreBadge score={score} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { setRejecting(true); await onReject(ann.id); setRejecting(false); }}
              disabled={approving || rejecting}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/50 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Reject
            </button>
            <button
              onClick={async () => { setApproving(true); await onApprove(ann.id); setApproving(false); }}
              disabled={approving || rejecting}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Benefits */}
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">User Benefits</p>
            <ul className="space-y-1">
              {ann.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <Star className="h-3 w-3 text-zinc-600 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Story */}
          {ann.story && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Story</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{ann.story}</p>
            </div>
          )}

          {/* Scores breakdown */}
          {hasScores && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Content Scores</p>
              <div className="grid grid-cols-2 gap-2">
                {scores.map((s) => (
                  <div key={s.format} className="bg-zinc-800/50 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 capitalize">{s.format.replace(/_/g, " ")}</span>
                      <ScoreBadge score={s.score} />
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-zinc-700">
                      <span>Hook {s.hook_strength}</span>
                      <span>Clear {s.clarity}</span>
                      <span>Benefits {s.benefit_emphasis}</span>
                      <span>Novel {s.novelty}</span>
                    </div>
                    {s.feedback && (
                      <p className="text-[9px] text-zinc-600 italic leading-tight">{s.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA + link */}
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span>CTA: <span className="text-zinc-400">{ann.cta}</span></span>
            {ann.link && <span>Link: <span className="text-zinc-400">{ann.link}</span></span>}
            {ann.audience && <span>Audience: <span className="text-zinc-400">{ann.audience}</span></span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main client component ───────────────────────────────────────────────────

export function AutomationClient({
  initialGroups,
  initialAnnouncements,
}: {
  initialGroups: CommitGroup[];
  initialAnnouncements: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [announcements, setAnnouncements] = useState(initialAnnouncements as unknown as Announcement[]);

  const runPipeline = async (groupId: string) => {
    try {
      const res = await fetch("/api/automation/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitGroupId: groupId }),
      });
      const data = await res.json().catch(() => ({})) as {
        status?: string;
        reason?: string;
        suggestion?: string;
        announcement?: { headline: string };
        error?: string;
      };

      if (data.status === "skipped" && data.reason === "duplicate") {
        toast.warning(`Duplicate detected. Try: "${data.suggestion}"`);
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
      } else if (data.status === "success") {
        toast.success(`Content generated: ${data.announcement?.headline ?? ""}`);
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        router.refresh(); // reload announcements from server
      } else {
        toast.error(data.error ?? "Pipeline failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const ignoreGroup = async (groupId: string) => {
    try {
      await fetch("/api/automation/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, status: "ignored" }),
      });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast.success("Ignored");
    } catch {
      toast.error("Failed to ignore group");
    }
  };

  const approveAnnouncement = async (id: string) => {
    try {
      const res = await fetch("/api/automation/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" }),
      });
      if (!res.ok) throw new Error();
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement approved — content moved to history");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const rejectAnnouncement = async (id: string) => {
    try {
      await fetch("/api/automation/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" }),
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Rejected");
    } catch {
      toast.error("Failed to reject");
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending commit groups */}
      {groups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <GitCommit className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold">Pending Commit Groups</h2>
            <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              {groups.length}
            </span>
          </div>
          <div className="space-y-3">
            {groups.map((group) => (
              <CommitGroupCard
                key={group.id}
                group={group}
                onRunPipeline={runPipeline}
                onIgnore={ignoreGroup}
              />
            ))}
          </div>
        </section>
      )}

      {/* Draft announcements */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Draft Announcements</h2>
            <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              {announcements.length}
            </span>
          </div>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <AnnouncementCard
                key={ann.id}
                ann={ann}
                onApprove={approveAnnouncement}
                onReject={rejectAnnouncement}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
