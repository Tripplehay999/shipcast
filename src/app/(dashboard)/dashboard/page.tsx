import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Rocket, GitMerge, CalendarClock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";

function getStreak(updates: { created_at: string }[]): number {
  if (!updates.length) return 0;
  const days = new Set(
    updates.map((u) => new Date(u.created_at).toISOString().slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export default async function DashboardPage() {
  const { userId } = await auth();

  const [{ data: profile }, { data: allUpdates }, plan, { count: pendingAutomation }, { data: topAnnouncements }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("clerk_user_id", userId).single(),
      supabaseAdmin
        .from("updates")
        .select("id, raw_update, created_at, generated_content(*)")
        .eq("clerk_user_id", userId)
        .order("created_at", { ascending: false }),
      getUserPlan(userId!),
      supabaseAdmin
        .from("commit_groups")
        .select("id", { count: "exact", head: true })
        .eq("clerk_user_id", userId!)
        .eq("status", "pending"),
      supabaseAdmin
        .from("announcement_objects")
        .select("headline, avg_score, best_tweet_score, created_at")
        .eq("clerk_user_id", userId!)
        .not("avg_score", "is", null)
        .order("avg_score", { ascending: false })
        .limit(3),
    ]);

  const updates = allUpdates ?? [];
  const totalUpdates = updates.length;
  const postsGenerated = totalUpdates * 5;
  const streak = getStreak(updates);
  const recentUpdates = updates.slice(0, 5);
  const automationCount = pendingAutomation ?? 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Marketing Command Center</h1>
            {streak > 1 && (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                🔥 {streak} day streak
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {profile?.product_name
              ? `${profile.product_name} · ${profile.brand_voice ?? "casual"} voice · ${plan} plan`
              : "Set up your product to get started"}
          </p>
        </div>
        <Link href="/new-update">
          <Button className="bg-white text-black hover:bg-zinc-200 font-semibold">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Content
          </Button>
        </Link>
      </div>

      {/* No profile CTA */}
      {!profile && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center justify-between mb-8">
          <div>
            <p className="font-medium text-white mb-0.5">Finish your setup</p>
            <p className="text-sm text-zinc-400">
              Add your product details so content sounds specific, not generic.
            </p>
          </div>
          <Link href="/onboarding">
            <Button className="bg-white text-black hover:bg-zinc-200 shrink-0">
              Complete setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* System health row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {/* Brand Profile */}
        <Link href="/settings">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
            <p className="text-xs text-zinc-500 mb-2 font-mono">Brand Profile</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  profile ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <p className="text-sm font-semibold text-white">
                {profile ? "Configured" : "Needs setup"}
              </p>
            </div>
          </div>
        </Link>

        {/* GitHub Sync */}
        <Link href="/automation">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
            <p className="text-xs text-zinc-500 mb-2 font-mono">GitHub Sync</p>
            <div className="flex items-center gap-1.5">
              {automationCount > 0 ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-white shrink-0" />
                  <p className="text-sm font-semibold text-white">{automationCount} pending</p>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
                  <p className="text-sm font-semibold text-zinc-400">Not connected</p>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Post Queue */}
        <Link href="/schedule">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
            <p className="text-xs text-zinc-500 mb-2 font-mono">Post Queue</p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
              <p className="text-sm font-semibold text-zinc-400">View queue</p>
            </div>
          </div>
        </Link>

        {/* Growth Radar */}
        <Link href="/radar">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
            <p className="text-xs text-zinc-500 mb-2 font-mono">Growth Radar</p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-sm font-semibold text-white">Active</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main two-column area */}
      <div className="grid sm:grid-cols-5 gap-6">
        {/* Content Pipeline */}
        <div className="sm:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Content Pipeline
            </h2>
            {totalUpdates > 5 && (
              <Link href="/history" className="text-xs text-zinc-600 hover:text-white transition-colors">
                View all →
              </Link>
            )}
          </div>

          {totalUpdates === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center space-y-3">
              <p className="text-3xl">🚀</p>
              <p className="text-zinc-400 text-sm font-medium">Nothing shipped yet.</p>
              <p className="text-zinc-600 text-xs">
                Write your first update and turn it into content in seconds.
              </p>
              <Link href="/new-update">
                <Button size="sm" className="bg-white text-black hover:bg-zinc-200 mt-2">
                  Ship your first update
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((update, i) => (
                <Link key={update.id} href="/history">
                  <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors cursor-pointer">
                    <span className="text-base shrink-0">
                      {["📦", "✨", "🔧", "🚀", "💡"][i % 5]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{update.raw_update}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {new Date(update.created_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}5 posts generated
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="sm:col-span-2 space-y-5">
          {/* Quick Launch */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Quick Launch
            </h2>
            <div className="space-y-2">
              <Link href="/new-update" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all">
                  <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">New Update</p>
                    <p className="text-xs text-zinc-600">Generate platform content</p>
                  </div>
                </div>
              </Link>
              <Link href="/launch-kit" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
                  <Rocket className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Launch Campaign</p>
                    <p className="text-xs text-zinc-600">Full launch package</p>
                  </div>
                </div>
              </Link>
              <Link href="/automation" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
                  <GitMerge className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Automation</p>
                    <p className="text-xs text-zinc-600">Ship → content, automated</p>
                  </div>
                </div>
              </Link>
              <Link href="/schedule" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                  <CalendarClock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Post Queue</p>
                    <p className="text-xs text-zinc-600">Schedule & distribute</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Stats
            </h2>
            <div className="space-y-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-zinc-500">Updates shipped</p>
                <p className="text-sm font-bold text-white">{totalUpdates}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-zinc-500">Posts generated</p>
                <p className="text-sm font-bold text-white">{postsGenerated}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-zinc-500">Day streak</p>
                <p className="text-sm font-bold text-white">
                  {streak}
                  {streak >= 7 && <span className="ml-1 text-orange-400">🔥</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Performance snapshot */}
          {topAnnouncements && topAnnouncements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Top Performers
                </h2>
                <Link href="/analytics" className="text-xs text-zinc-600 hover:text-white transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {topAnnouncements.map((a) => (
                  <Link key={a.headline} href="/analytics">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors">
                      <p className="text-xs text-white truncate mb-1">{a.headline}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${((a.avg_score ?? 0) / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                          {a.avg_score?.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
