"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Globe, Target, Zap, Twitter, Linkedin, MessageSquare,
  Rocket, Lightbulb, ArrowRight, Copy, Check, ChevronDown, ChevronUp,
  TrendingUp, Search, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Recommendations {
  productName: string;
  oneLiner: string;
  analyzedUrl: string;
  positioning: {
    currentMessaging: string;
    weakness: string;
    fix: string;
    taglines: string[];
  };
  audience: {
    primary: string;
    secondary: string;
    painPoints: string[];
    whereToFind: string;
  };
  quickWins: { action: string; why: string; effort: "low" | "medium" | "high" }[];
  platforms: {
    twitter: { strategy: string; bestFormat: string; hooks: string[]; postIdeas: string[] };
    linkedin: { strategy: string; bestFormat: string; hooks: string[]; postIdeas: string[] };
    reddit: { strategy: string; communities: string[]; postIdeas: string[] };
    productHunt: { launchAdvice: string; tagline: string; firstComment: string };
  };
  contentAngles: { angle: string; description: string; example: string }[];
  campaignIdeas: { name: string; description: string; platforms: string[]; duration: string }[];
  seoOpportunities: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const effortColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-600 hover:text-zinc-300 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-zinc-800">{children}</div>}
    </div>
  );
}

function IdeaCard({ text, label }: { text: string; label?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      {label && (
        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{label}</span>
      )}
      <p className="text-sm text-zinc-300 leading-relaxed flex-1">{text}</p>
      <CopyBtn text={text} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StrategyClient({
  savedUrl,
  productName,
}: {
  savedUrl: string | null;
  productName: string | null;
}) {
  const [url, setUrl] = useState(savedUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Recommendations | null>(null);

  const analyze = async (targetUrl?: string) => {
    const u = targetUrl ?? url;
    if (!u.trim()) { toast.error("Enter your product URL first"); return; }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketing Strategy</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Enter your URL and Shipcast breaks down exactly what to do — platform by platform.
          </p>
        </div>
        {data && (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent shrink-0"
            onClick={() => analyze()}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Re-analyze
          </Button>
        )}
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourproduct.com"
          type="url"
          className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 h-11"
          onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
          disabled={loading}
        />
        <Button
          onClick={() => analyze()}
          disabled={loading || !url.trim()}
          className="bg-white text-black hover:bg-zinc-200 h-11 px-6 shrink-0"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
          ) : (
            <><Globe className="h-4 w-4 mr-2" />Analyze</>
          )}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-zinc-600 mx-auto animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">Analyzing your product...</p>
          <p className="text-zinc-600 text-xs">Reading your site, identifying opportunities, building your plan</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-10 text-center space-y-4">
          <Target className="h-10 w-10 text-zinc-700 mx-auto" />
          <div>
            <p className="text-zinc-300 font-medium mb-1">Your full marketing action plan, in seconds</p>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto leading-relaxed">
              Enter your product URL above. Shipcast reads your site, identifies what to improve,
              and tells you exactly what to post — on every platform.
            </p>
          </div>
          {savedUrl && (
            <Button
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => analyze(savedUrl)}
            >
              <Globe className="h-4 w-4 mr-2" />
              Analyze {productName ?? savedUrl}
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">

          {/* Hero card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">{data.analyzedUrl}</span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Analyzed</Badge>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{data.productName}</h2>
              <p className="text-zinc-300 text-sm leading-relaxed">{data.oneLiner}</p>
            </div>
          </div>

          {/* Quick Wins */}
          <Section title="Quick Wins" icon={<Zap className="h-4 w-4" />}>
            <div className="space-y-3 mt-3">
              {data.quickWins?.map((win, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="text-xs font-mono text-zinc-600 mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <p className="text-sm font-medium text-white leading-snug">{win.action}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] ${effortColors[win.effort]}`}>{win.effort} effort</Badge>
                      <CopyBtn text={win.action} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 ml-6 leading-relaxed">{win.why}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Positioning */}
          <Section title="Positioning Fix" icon={<Target className="h-4 w-4" />}>
            <div className="space-y-4 mt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-2">Current</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{data.positioning?.currentMessaging}</p>
                  {data.positioning?.weakness && (
                    <p className="text-xs text-red-400/70 mt-2 leading-relaxed">Problem: {data.positioning.weakness}</p>
                  )}
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">Change to</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{data.positioning?.fix}</p>
                </div>
              </div>
              {data.positioning?.taglines?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Tagline options</p>
                  <div className="space-y-2">
                    {data.positioning.taglines.map((t, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5">
                        <p className="text-sm text-zinc-300 italic">&ldquo;{t}&rdquo;</p>
                        <CopyBtn text={t} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Audience */}
          <Section title="Target Audience" icon={<Target className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-4 mt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-1">Primary</p>
                  <p className="text-sm text-white font-medium">{data.audience?.primary}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Secondary</p>
                  <p className="text-sm text-zinc-300">{data.audience?.secondary}</p>
                </div>
              </div>
              {data.audience?.painPoints?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Pain points to speak to</p>
                  <div className="space-y-1.5">
                    {data.audience.painPoints.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.audience?.whereToFind && (
                <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                  <span className="text-zinc-400 font-medium">Where to find them: </span>
                  {data.audience.whereToFind}
                </p>
              )}
            </div>
          </Section>

          {/* Twitter */}
          <Section title="Twitter / X Strategy" icon={<Twitter className="h-4 w-4" />}>
            <div className="space-y-4 mt-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-zinc-300 leading-relaxed">{data.platforms?.twitter?.strategy}</p>
                  {data.platforms?.twitter?.bestFormat && (
                    <Badge className="mt-2 bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">
                      Best format: {data.platforms.twitter.bestFormat}
                    </Badge>
                  )}
                </div>
              </div>
              {data.platforms?.twitter?.hooks?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Hook ideas</p>
                  <div className="space-y-2">
                    {data.platforms.twitter.hooks.map((h, i) => (
                      <IdeaCard key={i} text={h} label={`hook ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}
              {data.platforms?.twitter?.postIdeas?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Post ideas</p>
                  <div className="space-y-2">
                    {data.platforms.twitter.postIdeas.map((p, i) => (
                      <IdeaCard key={i} text={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* LinkedIn */}
          <Section title="LinkedIn Strategy" icon={<Linkedin className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-4 mt-3">
              <div>
                <p className="text-sm text-zinc-300 leading-relaxed">{data.platforms?.linkedin?.strategy}</p>
                {data.platforms?.linkedin?.bestFormat && (
                  <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                    Best format: {data.platforms.linkedin.bestFormat}
                  </Badge>
                )}
              </div>
              {data.platforms?.linkedin?.hooks?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Opening hooks</p>
                  <div className="space-y-2">
                    {data.platforms.linkedin.hooks.map((h, i) => (
                      <IdeaCard key={i} text={h} label={`hook ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}
              {data.platforms?.linkedin?.postIdeas?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Post ideas</p>
                  <div className="space-y-2">
                    {data.platforms.linkedin.postIdeas.map((p, i) => (
                      <IdeaCard key={i} text={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Reddit */}
          <Section title="Reddit Strategy" icon={<MessageSquare className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-4 mt-3">
              <p className="text-sm text-zinc-300 leading-relaxed">{data.platforms?.reddit?.strategy}</p>
              {data.platforms?.reddit?.communities?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Best communities</p>
                  <div className="flex flex-wrap gap-2">
                    {data.platforms.reddit.communities.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
                        <span className="text-xs text-zinc-300">{c}</span>
                        <CopyBtn text={c} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.platforms?.reddit?.postIdeas?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Post ideas</p>
                  <div className="space-y-2">
                    {data.platforms.reddit.postIdeas.map((p, i) => (
                      <IdeaCard key={i} text={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Product Hunt */}
          <Section title="Product Hunt Launch" icon={<Rocket className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-3 mt-3">
              {data.platforms?.productHunt?.tagline && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-1">Suggested tagline</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white italic">&ldquo;{data.platforms.productHunt.tagline}&rdquo;</p>
                    <CopyBtn text={data.platforms.productHunt.tagline} />
                  </div>
                </div>
              )}
              {data.platforms?.productHunt?.launchAdvice && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Launch advice</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{data.platforms.productHunt.launchAdvice}</p>
                </div>
              )}
              {data.platforms?.productHunt?.firstComment && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Maker comment</p>
                    <CopyBtn text={data.platforms.productHunt.firstComment} />
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{data.platforms.productHunt.firstComment}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Content angles */}
          <Section title="Content Angles" icon={<Lightbulb className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-3 mt-3">
              {data.contentAngles?.map((a, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{a.angle}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{a.description}</p>
                  {a.example && (
                    <div className="flex items-start gap-2 bg-zinc-900 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">Example</span>
                      <p className="text-xs text-zinc-300 italic leading-relaxed flex-1">&ldquo;{a.example}&rdquo;</p>
                      <CopyBtn text={a.example} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Campaigns */}
          <Section title="Campaign Ideas" icon={<TrendingUp className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-3 mt-3">
              {data.campaignIdeas?.map((c, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <span className="text-[10px] font-mono text-zinc-600 shrink-0">{c.duration}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{c.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.platforms?.map((p) => (
                      <span key={p} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* SEO */}
          {data.seoOpportunities?.length > 0 && (
            <Section title="SEO Opportunities" icon={<Search className="h-4 w-4" />} defaultOpen={false}>
              <div className="space-y-2 mt-3">
                {data.seoOpportunities.map((kw, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5">
                    <p className="text-sm text-zinc-300">{kw}</p>
                    <CopyBtn text={kw} />
                  </div>
                ))}
              </div>
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
