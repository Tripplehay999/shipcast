"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GitCommit, Sparkles, Loader2, CheckCircle2, Copy, Check, X, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { DBMarketingEvent } from "@/lib/github/types";

interface Props {
  event: DBMarketingEvent;
  onStatusChange?: (id: string, status: string) => void;
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  feature_release: "Feature",
  bug_fix: "Fix",
  performance: "Perf",
  integration: "Integration",
  analytics: "Analytics",
  security: "Security",
  ux_improvement: "UX",
  api_change: "API",
  infrastructure: "Infra",
  other: "Other",
};

function CopyButton({ text }: { text: string }) {
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

export function EventCard({ event, onStatusChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ tweet: string; linkedin: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [dismissed, setDismissed] = useState(event.status === "dismissed");

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/integrations/github/events/${event.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({})) as { tweet?: string; linkedin?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      if (!data.tweet) throw new Error("No content returned — check your AI settings");
      setGenerated({ tweet: data.tweet, linkedin: data.linkedin ?? "" });
      onStatusChange?.(event.id, "promoted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const dismiss = async () => {
    setDismissed(true);
    onStatusChange?.(event.id, "dismissed");
    await fetch(`/api/integrations/github/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    }).catch(() => {});
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

  if (dismissed) return null;

  const eventTypeLabel = EVENT_TYPE_LABELS[event.event_type ?? ""] ?? "Event";
  const createdAt = event.created_at ? timeAgo(event.created_at) : null;

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">
                {eventTypeLabel}
              </Badge>
              {event.product_area && (
                <span className="text-xs text-zinc-600">{event.product_area}</span>
              )}
              {createdAt && <span className="text-xs text-zinc-600">{createdAt}</span>}
            </div>
            <p className="text-sm font-medium text-white leading-snug mt-0.5">{event.short_summary}</p>
          </div>
        </div>
        {!queued && (
          <button
            type="button"
            onClick={dismiss}
            className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Audience value */}
      {event.audience_value && (
        <div className="px-5 py-3 border-b border-zinc-800/60">
          <p className="text-xs text-zinc-500 leading-relaxed">{event.audience_value}</p>
        </div>
      )}

      {/* Error */}
      {genError && !generated && (
        <div className="px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">{genError}</p>
          </div>
        </div>
      )}

      {/* Generated content */}
      {generated && (
        <div className="px-5 py-4 space-y-3 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Generated tweet</p>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{generated.tweet}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{generated.tweet.length}/280 chars</span>
            <CopyButton text={generated.tweet} />
          </div>
          {generated.linkedin && (
            <>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide pt-1">LinkedIn</p>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{generated.linkedin}</p>
              </div>
              <div className="flex justify-end">
                <CopyButton text={generated.linkedin} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4">
        {queued ? (
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
              type="button"
              onClick={generated ? saveToQueue : generate}
              disabled={generating}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-semibold h-10"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : generated ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Save to Queue</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />{genError ? "Retry" : "Generate Post"}</>
              )}
            </Button>
            {!generated && (
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
