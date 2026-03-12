"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PlanLimit {
  id: string;
  plan: string;
  updates_per_month: number | null;
  scheduled_posts_limit: number | null;
  github_repos_limit: number | null;
  ai_calls_per_day: number | null;
  content_formats: number | null;
  updated_at: string;
}

const PLAN_COLOR: Record<string, string> = {
  free:   "text-zinc-400",
  pro:    "text-blue-400",
  studio: "text-violet-400",
};

function LimitInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={1}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : parseInt(e.target.value))}
      placeholder={placeholder ?? "∞ unlimited"}
      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 tabular-nums"
    />
  );
}

export function PlanLimitsManager({ initialLimits }: { initialLimits: PlanLimit[] }) {
  const [limits, setLimits] = useState<PlanLimit[]>(initialLimits);
  const [saving, setSaving] = useState<string | null>(null);

  const updateLimit = (id: string, field: keyof PlanLimit, value: number | null) => {
    setLimits((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const save = async (limit: PlanLimit) => {
    setSaving(limit.id);
    try {
      const res = await fetch("/api/admin/plan-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: limit.id,
          updates_per_month: limit.updates_per_month,
          scheduled_posts_limit: limit.scheduled_posts_limit,
          github_repos_limit: limit.github_repos_limit,
          ai_calls_per_day: limit.ai_calls_per_day,
          content_formats: limit.content_formats,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(`${limit.plan} plan limits saved`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Plan</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Updates/mo</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Sched. posts</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">GitHub repos</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">AI calls/day</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Formats</th>
            <th className="px-4 py-3 w-16" />
          </tr>
        </thead>
        <tbody>
          {limits.map((limit) => (
            <tr key={limit.id} className="border-b border-zinc-800/50 last:border-0">
              <td className="px-4 py-3">
                <span className={`font-semibold text-sm capitalize ${PLAN_COLOR[limit.plan] ?? "text-zinc-400"}`}>
                  {limit.plan}
                </span>
              </td>
              <td className="px-4 py-3 w-28">
                <LimitInput value={limit.updates_per_month} onChange={(v) => updateLimit(limit.id, "updates_per_month", v)} />
              </td>
              <td className="px-4 py-3 w-28">
                <LimitInput value={limit.scheduled_posts_limit} onChange={(v) => updateLimit(limit.id, "scheduled_posts_limit", v)} />
              </td>
              <td className="px-4 py-3 w-28">
                <LimitInput value={limit.github_repos_limit} onChange={(v) => updateLimit(limit.id, "github_repos_limit", v)} />
              </td>
              <td className="px-4 py-3 w-28">
                <LimitInput value={limit.ai_calls_per_day} onChange={(v) => updateLimit(limit.id, "ai_calls_per_day", v)} />
              </td>
              <td className="px-4 py-3 w-24">
                <LimitInput value={limit.content_formats} onChange={(v) => updateLimit(limit.id, "content_formats", v)} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => save(limit)}
                  disabled={saving === limit.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {saving === limit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-[10px] text-zinc-700 border-t border-zinc-800">
        Leave blank for unlimited. Changes apply to new sessions immediately.
      </p>
    </div>
  );
}
