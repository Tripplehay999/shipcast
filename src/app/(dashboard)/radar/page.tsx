"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Radio, RefreshCw, Loader2, Twitter, Linkedin,
  GitBranch, Copy, Check, ArrowRight, Zap,
} from "lucide-react";

interface Suggestion {
  trend: string;
  context: string;
  angle: string;
  hook: string;
  platform: "tweet" | "linkedin" | "thread";
  why_now: string;
}

const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  tweet:    { label: "Tweet",   icon: Twitter,    color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20" },
  linkedin: { label: "LinkedIn",icon: Linkedin,   color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  thread:   { label: "Thread",  icon: GitBranch,  color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
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
      {copied ? "Copied" : "Copy hook"}
    </button>
  );
}

function SuggestionCard({ s, index }: { s: Suggestion; index: number }) {
  const meta = PLATFORM_META[s.platform] ?? PLATFORM_META.tweet;
  const Icon = meta.icon;
  const router = useRouter();

  const useAngle = () => {
    // Store the hook in sessionStorage so New Update page can pick it up
    sessionStorage.setItem("shipcast_prefill", s.hook);
    router.push("/new-update");
  };

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group">
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
        {/* Angle */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Your angle</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{s.angle}</p>
        </div>

        {/* Hook */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Suggested hook</p>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <p className="text-sm text-white leading-relaxed font-medium">&ldquo;{s.hook}&rdquo;</p>
          </div>
        </div>

        {/* Why now */}
        <div className="flex items-start gap-2 rounded-lg bg-zinc-900/40 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 leading-relaxed">{s.why_now}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <CopyBtn text={s.hook} />
          <Button
            onClick={useAngle}
            size="sm"
            className="bg-white text-black hover:bg-zinc-200 h-8 text-xs font-semibold gap-1.5"
          >
            Use this angle
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  const [step, setStep] = useState(0);
  useState(() => {
    const timers = LOADING_STEPS.map((_, i) => setTimeout(() => setStep(i), i * 2500));
    return () => timers.forEach(clearTimeout);
  });
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [storiesAnalyzed, setStoriesAnalyzed] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const scan = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/radar");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setSuggestions(data.suggestions ?? []);
      setFetchedAt(data.fetchedAt);
      setStoriesAnalyzed(data.storiesAnalyzed ?? 0);
      setHasLoaded(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Radio className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">Startup Radar</h1>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Shipcast scans trending startup topics from Hacker News and generates personalized post angles for your product — tailored to what&apos;s hot right now.
        </p>
      </div>

      {/* Scan button / status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {fetchedAt && (
            <p className="text-xs text-zinc-600">
              Analyzed <span className="text-zinc-400">{storiesAnalyzed} stories</span> · {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          onClick={scan}
          disabled={loading}
          className={hasLoaded ? "bg-zinc-800 hover:bg-zinc-700 text-white h-9 text-sm" : "bg-white text-black hover:bg-zinc-200 font-semibold h-10"}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning…</>
          ) : hasLoaded ? (
            <><RefreshCw className="h-3.5 w-3.5 mr-2" />Refresh</>
          ) : (
            <><Radio className="h-4 w-4 mr-2" />Scan trends now</>
          )}
        </Button>
      </div>

      {/* Empty state */}
      {!loading && !hasLoaded && (
        <div className="border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center mx-auto">
            <Radio className="h-5 w-5 text-zinc-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">Ready to scan</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
              Click &ldquo;Scan trends now&rdquo; to fetch the latest startup discussions and get personalized post angles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {["Hacker News top stories", "48h trending topics", "AI-matched to your product"].map((tag) => (
              <span key={tag} className="text-[11px] text-zinc-600 border border-zinc-800 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Results */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
            {suggestions.length} angles ready to post
          </p>
          {suggestions.map((s, i) => (
            <SuggestionCard key={i} s={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
