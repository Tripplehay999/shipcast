import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: updates },
    { data: announcements },
    { data: scheduled },
    { data: generatedWithScores },
  ] = await Promise.all([
    supabaseAdmin
      .from("updates")
      .select("id, raw_update, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("announcement_objects")
      .select("id, headline, feature_name, avg_score, best_tweet_score, best_linkedin_score, category, created_at, content_scores(format, score, hook_strength, clarity, benefit_emphasis, novelty, feedback, needs_regeneration)")
      .eq("clerk_user_id", userId)
      .not("avg_score", "is", null)
      .order("avg_score", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("scheduled_posts")
      .select("id, platform, status, scheduled_at, content")
      .eq("clerk_user_id", userId)
      .order("scheduled_at", { ascending: false })
      .limit(100),
    // Scores from regular generate flow (no automation)
    supabaseAdmin
      .from("generated_content")
      .select("id, update_id, updates!inner(clerk_user_id, raw_update, created_at), content_scores(format, score, hook_strength, clarity, benefit_emphasis, novelty, feedback, needs_regeneration)")
      .eq("updates.clerk_user_id", userId)
      .not("content_scores", "is", null)
      .limit(100),
  ]);

  // Compute format-level averages from all content_scores (automation + regular)
  const allScores: { format: string; score: number; hook_strength: number; clarity: number; benefit_emphasis: number; novelty: number; needs_regeneration: boolean }[] = [];
  for (const ann of announcements ?? []) {
    for (const cs of (ann.content_scores ?? []) as typeof allScores) {
      allScores.push(cs);
    }
  }
  // Also include scores from regular generate flow
  const seenContentIds = new Set<string>();
  for (const gc of generatedWithScores ?? []) {
    if (seenContentIds.has(gc.id)) continue;
    seenContentIds.add(gc.id);
    for (const cs of (gc.content_scores ?? []) as typeof allScores) {
      allScores.push(cs);
    }
  }

  const formatMap: Record<string, { scores: number[]; hooks: number[]; clarity: number[]; benefit: number[]; count: number }> = {};
  for (const s of allScores) {
    if (!formatMap[s.format]) formatMap[s.format] = { scores: [], hooks: [], clarity: [], benefit: [], count: 0 };
    formatMap[s.format].scores.push(s.score);
    formatMap[s.format].hooks.push(s.hook_strength);
    formatMap[s.format].clarity.push(s.clarity);
    formatMap[s.format].benefit.push(s.benefit_emphasis);
    formatMap[s.format].count++;
  }

  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  const formatStats = Object.entries(formatMap).map(([format, data]) => ({
    format,
    avgScore: avg(data.scores),
    avgHook: avg(data.hooks),
    avgClarity: avg(data.clarity),
    avgBenefit: avg(data.benefit),
    count: data.count,
  })).sort((a, b) => b.avgScore - a.avgScore);

  const bestFormat = formatStats[0]?.format ?? null;
  const overallAvg = allScores.length ? avg(allScores.map((s) => s.score)) : 0;
  const needsWork = allScores.filter((s) => s.needs_regeneration).length;

  // Platform distribution from scheduled_posts
  const platformCounts: Record<string, number> = {};
  for (const post of scheduled ?? []) {
    platformCounts[post.platform] = (platformCounts[post.platform] ?? 0) + 1;
  }

  // Recent activity by week
  const now = Date.now();
  const thisWeek = (updates ?? []).filter((u) => now - new Date(u.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const lastWeek = (updates ?? []).filter((u) => {
    const age = now - new Date(u.created_at).getTime();
    return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
  }).length;

  return NextResponse.json({
    summary: {
      totalUpdates: (updates ?? []).length,
      totalPostsGenerated: (updates ?? []).length * 5,
      totalScored: allScores.length,
      overallAvgScore: overallAvg,
      needsWork,
      bestFormat,
      thisWeek,
      lastWeek,
    },
    formatStats,
    topAnnouncements: [
      // From automation pipeline (have pre-computed scores)
      ...(announcements ?? []).slice(0, 10).map((a) => ({
        id: a.id,
        headline: a.headline ?? a.feature_name ?? "Untitled",
        avgScore: a.avg_score,
        bestTweetScore: a.best_tweet_score,
        bestLinkedinScore: a.best_linkedin_score,
        category: a.category ?? null,
        createdAt: a.created_at,
        source: "automation" as const,
      })),
      // From regular generate flow (compute avg from content_scores)
      ...(generatedWithScores ?? [])
        .filter((gc) => (gc.content_scores as typeof allScores ?? []).length > 0)
        .map((gc) => {
          const scores = (gc.content_scores as typeof allScores ?? []);
          const avg = scores.length ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : 0;
          const update = gc.updates as unknown as { raw_update: string; created_at: string };
          return {
            id: gc.id,
            headline: update?.raw_update?.slice(0, 80) ?? "Update",
            avgScore: avg,
            bestTweetScore: scores.find((s) => s.format === "tweet")?.score ?? null,
            bestLinkedinScore: scores.find((s) => s.format === "linkedin")?.score ?? null,
            category: null,
            createdAt: update?.created_at ?? new Date().toISOString(),
            source: "manual" as const,
          };
        })
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10),
    ].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10),
    platformDistribution: Object.entries(platformCounts).map(([platform, count]) => ({ platform, count })),
    scheduledCount: (scheduled ?? []).filter((s) => s.status === "pending").length,
    postedCount: (scheduled ?? []).filter((s) => s.status === "posted").length,
  });
}
