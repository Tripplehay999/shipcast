"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Sparkles, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ContentScore {
  format: string;
  score: number;
  hook_strength: number;
  clarity: number;
  benefit_emphasis: number;
  novelty: number;
  feedback: string | null;
  needs_regeneration: boolean;
}

interface Announcement {
  id: string;
  headline: string;
  feature_name: string;
  avg_score: number | null;
  best_tweet_score: number | null;
  best_linkedin_score: number | null;
  category: string;
  created_at: string;
  content_scores: ContentScore[];
}

interface Props {
  updates: { id: string; raw_update: string; created_at: string }[];
  announcements: Record<string, unknown>[];
  scheduled: { id: string; platform: string; status: string; scheduled_at: string }[];
}

export function AnalyticsClient({ updates, announcements, scheduled }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const typedAnnouncements = announcements as unknown as Announcement[];

  // Compute format stats from announcements[].content_scores[]
  const allScores = typedAnnouncements.flatMap((a) => (a.content_scores as ContentScore[]) ?? []);
  const formatMap: Record<string, { scores: number[]; hooks: number[] }> = {};
  for (const s of allScores) {
    if (!formatMap[s.format]) formatMap[s.format] = { scores: [], hooks: [] };
    formatMap[s.format].scores.push(s.score);
    formatMap[s.format].hooks.push(s.hook_strength);
  }
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
  const formatStats = Object.entries(formatMap)
    .map(([format, d]) => ({ format, avgScore: avg(d.scores), avgHook: avg(d.hooks), count: d.scores.length }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const overallAvg = allScores.length ? avg(allScores.map((s) => s.score)) : 0;
  const bestFormat = formatStats[0]?.format ?? null;
  const needsWork = allScores.filter((s) => s.needs_regeneration).length;

  const platformCounts: Record<string, number> = {};
  for (const p of scheduled) platformCounts[p.platform] = (platformCounts[p.platform] ?? 0) + 1;

  const now = Date.now();
  const thisWeek = updates.filter(
    (u) => now - new Date(u.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  const scheduledCount = scheduled.filter((s) => s.status === "pending").length;

  const generateInsights = async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formatStats,
          topAnnouncements: typedAnnouncements
            .slice(0, 5)
            .map((a) => ({ headline: a.headline, avgScore: a.avg_score })),
          summary: { totalScored: allScores.length, overallAvgScore: overallAvg, needsWork, bestFormat },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInsight(data.insight);
    } catch {
      toast.error("Failed to generate insights");
    } finally {
      setLoadingInsight(false);
    }
  };

  // Scores are 0-100 in DB
  const scoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const scoreDot = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            AI-scored content analytics — see what works, improve what doesn&apos;t
          </p>
        </div>
        <Button
          onClick={generateInsights}
          disabled={loadingInsight}
          className="bg-white text-black hover:bg-zinc-200 font-semibold"
        >
          {loadingInsight ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {/* AI Insights Panel */}
      {(insight || loadingInsight) && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">AI Insights</span>
          </div>
          {loadingInsight ? (
            <p className="text-zinc-400 text-sm">Analyzing your content patterns...</p>
          ) : insight ? (
            <div className="space-y-2">
              {insight.split("•").filter(Boolean).map((point, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                  <p className="text-sm text-white leading-relaxed">{point.trim()}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-2 font-mono">Total Updates</p>
          <p className="text-2xl font-bold text-white">{updates.length}</p>
          <p className="text-xs text-zinc-600 mt-1">{thisWeek} this week</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-2 font-mono">Avg Score</p>
          <div className="flex items-center gap-1.5">
            {allScores.length > 0 && (
              <span className={`h-2 w-2 rounded-full shrink-0 ${scoreDot(overallAvg)}`} />
            )}
            <p className={`text-2xl font-bold ${allScores.length > 0 ? scoreColor(overallAvg) : "text-zinc-600"}`}>
              {allScores.length > 0 ? `${overallAvg}/100` : "—"}
            </p>
          </div>
          <p className="text-xs text-zinc-600 mt-1">{allScores.length} posts scored</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-2 font-mono">Best Format</p>
          <p className="text-lg font-bold text-white capitalize truncate">
            {bestFormat ? bestFormat.replace("_", " ") : "—"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {formatStats[0] ? `${formatStats[0].avgScore}/100 avg` : "No data yet"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-2 font-mono">Posts Queued</p>
          <p className="text-2xl font-bold text-white">{scheduledCount}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {scheduled.filter((s) => s.status === "posted").length} posted
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid sm:grid-cols-5 gap-6 mb-8">
        {/* Format Performance */}
        <div className="sm:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Score by Format
            </h2>
          </div>

          {formatStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium mb-1">No scored posts yet</p>
              <p className="text-zinc-600 text-xs">
                Generate your first piece of content — posts are AI-scored automatically.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              {formatStats.map((f) => (
                <div key={f.format} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-24 capitalize shrink-0">
                    {f.format.replace("_", " ")}
                  </span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        f.avgScore >= 70
                          ? "bg-emerald-500"
                          : f.avgScore >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${f.avgScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white w-10 text-right shrink-0">
                    {f.avgScore}/100
                  </span>
                  <span className="text-xs text-zinc-600 w-14 text-right shrink-0">
                    {f.count} posts
                  </span>
                </div>
              ))}

              {/* Hook strength sub-row */}
              {formatStats.length > 0 && (
                <>
                  <div className="border-t border-zinc-800 pt-3 mt-2">
                    <p className="text-xs text-zinc-600 mb-3">Hook strength by format</p>
                    {formatStats.map((f) => (
                      <div key={`hook-${f.format}`} className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-zinc-600 w-24 capitalize shrink-0">
                          {f.format.replace("_", " ")}
                        </span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              f.avgHook >= 17
                                ? "bg-emerald-600"
                                : f.avgHook >= 12
                                ? "bg-amber-600"
                                : "bg-red-600"
                            }`}
                            style={{ width: `${f.avgHook * 4}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-500 w-10 text-right shrink-0">
                          {f.avgHook}/25
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: needs work + platform distribution */}
        <div className="sm:col-span-2 space-y-5">
          {/* Needs work */}
          {needsWork > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                  Needs Attention
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{needsWork}</p>
              <p className="text-xs text-zinc-400 mt-1">
                posts flagged for regeneration by the AI scorer
              </p>
            </div>
          )}

          {/* Platform distribution */}
          {Object.keys(platformCounts).length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Platform Distribution
              </h2>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                {Object.entries(platformCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => {
                    const total = Object.values(platformCounts).reduce((a, b) => a + b, 0);
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={platform} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-24 capitalize shrink-0">
                          {platform.replace("_", " ")}
                        </span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-8 text-right shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* No data empty state for right col */}
          {Object.keys(platformCounts).length === 0 && needsWork === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
              <BarChart2 className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium mb-1">No distribution data</p>
              <p className="text-zinc-600 text-xs">
                Schedule posts to see platform breakdown.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Posts table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Top Performing Posts
          </h2>
          {typedAnnouncements.length > 0 && (
            <Badge className="ml-auto bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
              {typedAnnouncements.length} scored
            </Badge>
          )}
        </div>

        {typedAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center space-y-3">
            <TrendingUp className="h-10 w-10 text-zinc-700 mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">No scored posts yet</p>
            <p className="text-zinc-600 text-xs max-w-xs mx-auto">
              Generate content from the Create Content page — every post is AI-scored automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-zinc-800 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              <div className="col-span-5">Headline</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Tweet</div>
              <div className="col-span-2 text-center">LinkedIn</div>
              <div className="col-span-1 text-right">Date</div>
            </div>
            {typedAnnouncements.slice(0, 8).map((a, i) => (
              <div
                key={a.id ?? i}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="col-span-5 flex items-center">
                  <p className="text-sm text-white truncate">
                    {a.headline ?? a.feature_name ?? "Untitled"}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  {a.avg_score != null ? (
                    <span className={`text-sm font-mono font-bold ${scoreColor(a.avg_score)}`}>
                      {a.avg_score}
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-sm">—</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  {a.best_tweet_score != null ? (
                    <span className={`text-sm font-mono ${scoreColor(a.best_tweet_score)}`}>
                      {a.best_tweet_score}
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-sm">—</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  {a.best_linkedin_score != null ? (
                    <span className={`text-sm font-mono ${scoreColor(a.best_linkedin_score)}`}>
                      {a.best_linkedin_score}
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-sm">—</span>
                  )}
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-xs text-zinc-600">
                    {new Date(a.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
