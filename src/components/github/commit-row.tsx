"use client";

import type { DBCommit, CommitType } from "@/lib/github/types";

const TYPE_COLORS: Record<CommitType, string> = {
  feature: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fix: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  perf: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  refactor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  docs: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  chore: "bg-zinc-500/10 text-zinc-500 border-zinc-700",
  test: "bg-zinc-500/10 text-zinc-500 border-zinc-700",
  unknown: "bg-zinc-500/10 text-zinc-500 border-zinc-700",
};

const TYPE_LABELS: Record<CommitType, string> = {
  feature: "feat",
  fix: "fix",
  perf: "perf",
  refactor: "refactor",
  docs: "docs",
  chore: "chore",
  test: "test",
  unknown: "—",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface CommitRowProps {
  commit: DBCommit;
}

export function CommitRow({ commit }: CommitRowProps) {
  const colorClass = TYPE_COLORS[commit.commit_type] ?? TYPE_COLORS.unknown;
  const typeLabel = TYPE_LABELS[commit.commit_type] ?? commit.commit_type;
  const scorePercent = Math.round(commit.marketing_score * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/40 transition-colors">
      {/* Type badge */}
      <span
        className={`shrink-0 text-[10px] border px-2 py-0.5 rounded-full font-mono font-medium ${colorClass}`}
      >
        {typeLabel}
      </span>

      {/* Title + author */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{commit.title}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {commit.author_name ?? "unknown"} · {timeAgo(commit.committed_at)}
        </p>
      </div>

      {/* SHA */}
      <code className="shrink-0 text-[10px] text-zinc-600 font-mono hidden sm:block">
        {commit.sha.slice(0, 7)}
      </code>

      {/* Score bar */}
      <div className="shrink-0 flex items-center gap-1.5" title={`Marketing score: ${scorePercent}%`}>
        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              scorePercent >= 60
                ? "bg-emerald-500"
                : scorePercent >= 40
                ? "bg-amber-500"
                : "bg-zinc-600"
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-600 w-6 text-right">{scorePercent}%</span>
      </div>
    </div>
  );
}
