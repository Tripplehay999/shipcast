"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import {
  Radio, RefreshCw, Loader2, Twitter, Linkedin,
  GitBranch, Copy, Check, Zap, CalendarClock, CheckCircle2,
} from "lucide-react";

interface Suggestion {
  trend: string;
  context: string;
  angle: string;
  hook: string;
  platform: "tweet" | "linkedin" | "thread";
  why_now: string;
}

interface CachedRadar {
  suggestions: Suggestion[];
  fetchedAt: string;
  storiesAnalyzed: number;
}

const CACHE_KEY = "shipcast_radar_cache";

const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; schedPlatform: string }> = {
  tweet:    { label: "Tweet",    icon: Twitter,   color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20",       schedPlatform: "twitter" },
  linkedin: { label: "LinkedIn", icon: Linkedin,  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     schedPlatform: "linkedin" },
  thread:   { label: "Thread",   icon: GitBranch, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", schedPlatform: "twitter" },
};

const LOADING_STEPS = [
  "Scanning Hacker News…",
  "Analyzing startup trends…",
  "Matching to your product…",
  "Generating post angles…",
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SuggestionCard({ s, index }: { s: Suggestion; index: number }) {
  const meta = PLATFORM_META[s.platform] ?? PLATFORM_META.tweet;
  const Icon = meta.icon;

  const [state, setState] = useState<"idle" | "generating" | "queued">("idle");
  const [queuedContent, setQueuedContent] = useState<string | null>(null);

  const addToQueue = async () => {
    setState("generating");
    try {
      // Generate content from the hook
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawUpdate: s.hook }),
      });
      const genData = await genRes.json().catch(() => ({}));
      if (!genRes.ok) throw new Error(genData.error ?? "Generation failed");

      const content = genData.content?.tweet ?? s.hook;

      // Schedule for tomorrow at 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const schedRes = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: meta.schedPlatform,
          content,
          scheduledAt: tomorrow.toISOString(),
        }),
      });
      const schedData = await schedRes.json().catch(() => ({}));
      if (!schedRes.ok) throw new Error(schedData.error ?? "Queue failed");

      setQueuedContent(content);
      setState("queued");
      toast.success("Added to Post Queue for tomorrow 9am!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${state === "queued" ? "border-emerald-500/30" : "border-zinc-800 hover:border-zinc-700"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-mono text-zinc-600 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{s.trend}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.context}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${meta.bg} ${meta.color}`}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Your angle</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{s.angle}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Suggested hook</p>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <p className="text-sm text-white leading-relaxed font-medium">&ldquo;{s.hook}&rdquo;</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-zinc-900/40 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 leading-relaxed">{s.why_now}</p>
        </div>

        {/* Queued state */}
        {state === "queued" && queuedContent && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-xs font-medium text-emerald-400">Queued for tomorrow at 9am</p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{queuedContent}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <CopyBtn text={s.hook} />
          <div className="flex items-center gap-2">
            {state === "queued" ? (
              <Link
                href="/schedule"
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <CalendarClock className="h-3 w-3" />
                View in Post Queue
              </Link>
            ) : (
              <Button
                onClick={addToQueue}
                disabled={state === "generating"}
                size="sm"
                className="bg-white text-black hover:bg-zinc-200 h-8 text-xs font-semibold gap-1.5"
              >
                {state === "generating" ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
                ) : (
                  <><CalendarClock className="h-3 w-3" />Queue this post</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center py-24 space-y-6">
      <div className="relative">
        <div className="h-14 w-14 rounded-full border-2 border-zinc-800 flex items-center justify-center">
          <Radio className="h-6 w-6 text-white animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
      </div>
      <div className="text-center space-y-3">
        <p className="text-white font-medium">{LOADING_STEPS[step]}</p>
        <div className="flex gap-1.5 justify-center">
          {LOADING_STEPS.map((_, i) => (
            <div key={i} className={`h-1 w-6 rounded-full transition-all duration-700 ${i <= step ? "bg-white" : "bg-zinc-800"}`} />
          ))}
        </div>
        <p className="text-xs text-zinc-600">Scanning HN trends from the last 48 hours</p>
      </div>
    </div>
  );
}

export default function RadarPage() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [storiesAnalyzed, setStoriesAnalyzed] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedRadar = JSON.parse(raw);
        setSuggestions(cached.suggestions);
        setFetchedAt(cached.fetchedAt);
        setStoriesAnalyzed(cached.storiesAnalyzed);
      }
    } catch { /* ignore */ }
  }, []);

  const scan = async () => {
    setLoading(true);
    setLoadingStep(0);
    const stepTimers = LOADING_STEPS.map((_, i) => setTimeout(() => setLoadingStep(i), i * 2500));

    try {
      const res = await fetch("/api/radar");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Scan failed");

      const result: CachedRadar = {
        suggestions: data.suggestions ?? [],
        fetchedAt: data.fetchedAt,
        storiesAnalyzed: data.storiesAnalyzed ?? 0,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      setSuggestions(result.suggestions);
      setFetchedAt(result.fetchedAt);
      setStoriesAnalyzed(result.storiesAnalyzed);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      stepTimers.forEach(clearTimeout);
      setLoading(false);
    }
  };

  const hasResults = suggestions.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Radio className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">Startup Radar</h1>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Scans trending startup topics from Hacker News and generates post angles for your product. Click <span className="text-white">Queue this post</span> to generate and schedule it automatically.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          {fetchedAt && (
            <p className="text-xs text-zinc-600">
              {storiesAnalyzed} stories analyzed · {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          onClick={scan}
          disabled={loading}
          className={hasResults
            ? "bg-zinc-800 hover:bg-zinc-700 text-white h-9 text-sm"
            : "bg-white text-black hover:bg-zinc-200 font-semibold h-10"
          }
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning…</>
          ) : hasResults ? (
            <><RefreshCw className="h-3.5 w-3.5 mr-2" />Refresh</>
          ) : (
            <><Radio className="h-4 w-4 mr-2" />Scan trends now</>
          )}
        </Button>
      </div>

      {!loading && !hasResults && (
        <div className="border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center mx-auto">
            <Radio className="h-5 w-5 text-zinc-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">Ready to scan</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
              Scan trending topics → pick an angle → one click to generate and queue the post for tomorrow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {["Hacker News top stories", "48h trending topics", "AI-matched to your product"].map((tag) => (
              <span key={tag} className="text-[11px] text-zinc-600 border border-zinc-800 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingState step={loadingStep} />}

      {!loading && hasResults && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
            {suggestions.length} trending angles · click to generate &amp; queue
          </p>
          {suggestions.map((s, i) => (
            <SuggestionCard key={i} s={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
