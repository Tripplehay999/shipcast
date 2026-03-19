import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AnalyticsClient } from "./analytics-client";

type ContentScore = {
  format: string;
  score: number;
  hook_strength: number;
  clarity: number;
  benefit_emphasis: number;
  novelty: number;
  feedback: string | null;
  needs_regeneration: boolean;
};

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [
    { data: updates },
    { data: announcements },
    { data: scheduled },
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
      .select("id, platform, status, scheduled_at")
      .eq("clerk_user_id", userId)
      .limit(200),
  ]);

  // Fetch scores for manually generated content (regular generate flow)
  const updateIds = (updates ?? []).map((u) => u.id);
  const { data: generatedContent } = updateIds.length > 0
    ? await supabaseAdmin
        .from("generated_content")
        .select("id, update_id, content_scores(format, score, hook_strength, clarity, benefit_emphasis, novelty, feedback, needs_regeneration)")
        .in("update_id", updateIds)
        .limit(100)
    : { data: [] };

  // Build update ID → metadata map
  const updateMap = Object.fromEntries(
    (updates ?? []).map((u) => [u.id, { raw_update: u.raw_update, created_at: u.created_at }])
  );

  // Normalize regular generations into the same shape as announcements
  const normalizedGenerations = (generatedContent ?? [])
    .filter((gc) => (gc.content_scores as ContentScore[] ?? []).length > 0)
    .map((gc) => {
      const scores = gc.content_scores as ContentScore[];
      const avgScore = scores.length
        ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length)
        : 0;
      const update = updateMap[gc.update_id];
      return {
        id: gc.id,
        headline: update?.raw_update?.slice(0, 80) ?? "Update",
        feature_name: null as null,
        avg_score: avgScore,
        best_tweet_score: scores.find((s) => s.format === "tweet")?.score ?? null,
        best_linkedin_score: scores.find((s) => s.format === "linkedin")?.score ?? null,
        category: "update",
        created_at: update?.created_at ?? new Date().toISOString(),
        content_scores: scores,
      };
    });

  // Merge automation + manual, sorted by score
  const allAnnouncements = [
    ...(announcements ?? []),
    ...normalizedGenerations,
  ].sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));

  return (
    <AnalyticsClient
      updates={updates ?? []}
      announcements={allAnnouncements as Record<string, unknown>[]}
      scheduled={scheduled ?? []}
    />
  );
}
