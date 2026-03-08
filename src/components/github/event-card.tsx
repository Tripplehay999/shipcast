"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Check, Sparkles, Loader2, Twitter, Linkedin, ExternalLink, AlertCircle } from "lucide-react";
import type { DBMarketingEvent } from "@/lib/github/types";

interface Props {
  event: DBMarketingEvent;
  onStatusChange?: (id: string, status: string) => void;
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

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-zinc-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent h-7 px-2.5">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function EventCard({ event, onStatusChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ tweet: string; linkedin: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [queuing, setQueuing] = useState(false);
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
    });
  };

  const saveToQueue = async (content: string) => {
    setQueuing(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, scheduled_for: tomorrow.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to queue");
      setQueued(true);
      toast.success("Saved to Post Queue for tomorrow 9am");
    } catch {
      toast.error("Failed to save to queue");
    } finally {
      setQueuing(false);
    }
  };

  if (dismissed) return null;

  const eventTypeLabel = EVENT_TYPE_LABELS[event.event_type ?? ""] ?? "Event";
  const commitTime = event.commit?.committed_at
    ? new Date(event.commit.committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const score = event.confidence ?? 0;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                {eventTypeLabel}
              </Badge>
              {event.product_area && (
                <Badge variant="outline" className="border-zinc-800 text-zinc-500 text-xs">
                  {event.product_area}
                </Badge>
              )}
              {commitTime && <span className="text-xs text-zinc-600">{commitTime}</span>}
            </div>
            <p className="text-sm text-white font-medium leading-snug">{event.short_summary}</p>
            {event.audience_value && (
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{event.audience_value}</p>
            )}
          </div>
          <ScoreBar score={score} />
        </div>

        {/* Error state */}
        {genError && !generated && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">{genError}</p>
          </div>
        )}

        {/* Generated content */}
        {generated ? (
          <div className="space-y-3">
            <Tabs defaultValue="tweet">
              <TabsList className="bg-zinc-800 border border-zinc-700 h-8">
                <TabsTrigger value="tweet" className="text-xs h-6 data-[state=active]:bg-zinc-700">
                  <Twitter className="h-3 w-3 mr-1" /> Tweet
                </TabsTrigger>
                <TabsTrigger value="linkedin" className="text-xs h-6 data-[state=active]:bg-zinc-700">
                  <Linkedin className="h-3 w-3 mr-1" /> LinkedIn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tweet" className="mt-2 space-y-2">
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                  <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">{generated.tweet}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{generated.tweet.length}/280 chars</span>
                  <div className="flex gap-2">
                    <CopyButton text={generated.tweet} />
                    {!queued ? (
                      <Button
                        size="sm"
                        className="bg-white text-black hover:bg-zinc-200 h-7 px-2.5 text-xs"
                        onClick={() => saveToQueue(generated.tweet)}
                        disabled={queuing}
                      >
                        {queuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save to Queue"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-7 px-2.5 text-xs bg-transparent" asChild>
                        <a href="/queue"><ExternalLink className="h-3 w-3 mr-1" />View Queue</a>
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="linkedin" className="mt-2 space-y-2">
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                  <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">{generated.linkedin}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{generated.linkedin.length} chars</span>
                  <div className="flex gap-2">
                    <CopyButton text={generated.linkedin} />
                    {!queued ? (
                      <Button
                        size="sm"
                        className="bg-white text-black hover:bg-zinc-200 h-7 px-2.5 text-xs"
                        onClick={() => saveToQueue(generated.linkedin)}
                        disabled={queuing}
                      >
                        {queuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save to Queue"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-7 px-2.5 text-xs bg-transparent" asChild>
                        <a href="/queue"><ExternalLink className="h-3 w-3 mr-1" />View Queue</a>
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Actions */
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="bg-white text-black hover:bg-zinc-200 h-8 text-xs"
              onClick={generate}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Writing post…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{genError ? "Retry" : "Generate Post"}</>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-600 hover:text-zinc-400 h-8 text-xs"
              onClick={dismiss}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
