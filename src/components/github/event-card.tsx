"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Star, CheckCircle2, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
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

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface EventCardProps {
  event: DBMarketingEvent;
  onStatusChange: (id: string, status: string) => void;
}

export function EventCard({ event, onStatusChange }: EventCardProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ tweet: string; linkedin: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (event.status === "dismissed") return null;

  const colorClass = EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.other;
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/integrations/github/events/${event.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({})) as { tweet?: string; linkedin?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      if (!data.tweet) throw new Error("No content returned — check your AI settings");
      setGenerated({ tweet: data.tweet, linkedin: data.linkedin ?? "" });
      onStatusChange(event.id, "promoted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await fetch(`/api/integrations/github/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      onStatusChange(event.id, "dismissed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss");
      setDismissing(false);
    }
  };

  const saveToQueue = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: generated?.tweet, scheduled_for: tomorrow.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to queue");
      setQueued(true);
      toast.success("Saved to Post Queue for tomorrow 9am");
    } catch {
      toast.error("Failed to save to queue");
    }
  };

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
      <div className="px-5 py-4">
        {/* Badges row */}
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

        {/* Summary + audience value */}
        <p className="text-sm font-semibold text-white leading-snug">{event.short_summary}</p>
        {event.audience_value && (
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{event.audience_value}</p>
        )}

        {/* Meta row */}
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

      {/* Error */}
      {genError && !generated && (
        <div className="px-5 pb-3">
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">{genError}</p>
          </div>
        </div>
      )}

      {/* Generated content */}
      {generated && (
        <div className="px-5 pb-4 space-y-3 border-t border-zinc-800">
          <div className="pt-3 space-y-2">
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Tweet</p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{generated.tweet}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">{generated.tweet.length}/280 chars</span>
              <CopyBtn text={generated.tweet} />
            </div>
          </div>
          {generated.linkedin && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">LinkedIn</p>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{generated.linkedin}</p>
              </div>
              <div className="flex justify-end">
                <CopyBtn text={generated.linkedin} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-4 flex items-center gap-3">
        {queued ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">Post added to queue</p>
            </div>
            <Link href="/schedule" className="text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
              View in Post Queue →
            </Link>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={generated ? saveToQueue : handleGenerate}
              disabled={generating || dismissing}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-semibold h-9 text-sm"
            >
              {generating ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Generating…</>
              ) : generated ? (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Save to Queue</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-2" />{genError ? "Retry" : "Generate Content"}</>
              )}
            </Button>
            {!generated && (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={generating || dismissing}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
              >
                {dismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                <span className="text-xs">Dismiss</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
