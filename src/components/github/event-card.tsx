"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Star, CheckCircle2, Loader2 } from "lucide-react";
import type { DBMarketingEvent } from "@/lib/github/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_release: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  bug_fix: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  performance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  integration: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  analytics: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  security: "bg-red-500/10 text-red-400 border-red-500/20",
  ux_improvement: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  api_change: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  infrastructure: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  feature_release: "Feature",
  bug_fix: "Bug Fix",
  performance: "Performance",
  integration: "Integration",
  analytics: "Analytics",
  security: "Security",
  ux_improvement: "UX",
  api_change: "API Change",
  infrastructure: "Infrastructure",
  other: "Other",
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

interface EventCardProps {
  event: DBMarketingEvent;
  onStatusChange: (id: string, status: string) => void;
}

export function EventCard({ event, onStatusChange }: EventCardProps) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (event.status === "dismissed") return null;

  const colorClass = EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.other;
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;

  const updateStatus = async (newStatus: string) => {
    const res = await fetch(`/api/integrations/github/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Update failed");
    }
  };

  const handleGenerate = async () => {
    setPromoting(true);
    try {
      await updateStatus("promoted");
      onStatusChange(event.id, "promoted");
      const prefill = encodeURIComponent(event.audience_value ?? event.short_summary);
      router.push(`/new-update?prefill=${prefill}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to promote event");
    } finally {
      setPromoting(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await updateStatus("dismissed");
      onStatusChange(event.id, "dismissed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss");
    } finally {
      setDismissing(false);
    }
  };

  if (event.status === "promoted") {
    return (
      <div className="border border-emerald-500/20 rounded-2xl bg-emerald-500/5 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Promoted</p>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{event.short_summary}</p>
          </div>
        </div>
        <a href="/new-update" className="text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
          View in Post Queue →
        </a>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge className={`${colorClass} text-[10px] border font-medium`}>{typeLabel}</Badge>
          {event.product_area && (
            <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              {event.product_area}
            </span>
          )}
          {event.launch_worthy && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Star className="h-2.5 w-2.5" />
              Launch worthy
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-600 shrink-0">
            {Math.round(event.confidence * 100)}% confidence
          </span>
        </div>
        <p className="text-sm font-semibold text-white leading-snug">{event.short_summary}</p>
        {event.audience_value && (
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{event.audience_value}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <code className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
            {event.commit?.sha?.slice(0, 7) ?? "unknown"}
          </code>
          {event.commit?.committed_at && (
            <span className="text-[10px] text-zinc-600">{timeAgo(event.commit.committed_at)}</span>
          )}
          {event.likely_audience && (
            <span className="text-[10px] text-zinc-600">· for {event.likely_audience}</span>
          )}
        </div>
      </div>
      <div className="px-5 pb-4 flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={promoting || dismissing}
          className="flex-1 bg-white text-black hover:bg-zinc-200 font-semibold h-9 text-sm"
        >
          {promoting ? (
            <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Promoting…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5 mr-2" />Generate Content</>
          )}
        </Button>
        <button
          onClick={handleDismiss}
          disabled={promoting || dismissing}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
        >
          {dismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          <span className="text-xs">Dismiss</span>
        </button>
      </div>
    </div>
  );
}
