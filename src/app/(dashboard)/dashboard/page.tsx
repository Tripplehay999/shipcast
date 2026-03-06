import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, ArrowRight, Zap, Flame, BarChart2, Settings } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";

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

const quickPrompts = [
  "Fixed a bug that was affecting some users.",
  "Added a new onboarding step to reduce drop-off.",
  "Improved loading speed by 40%.",
  "Launched a new pricing page.",
  "Shipped email notifications for key events.",
];

export default async function DashboardPage() {
  const { userId } = await auth();

  const [{ data: profile }, { data: allUpdates }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("clerk_user_id", userId).single(),
    supabaseAdmin
      .from("updates")
      .select("id, raw_update, created_at, generated_content(*)")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const updates = allUpdates ?? [];
  const totalUpdates = updates.length;
  const postsGenerated = totalUpdates * 5;
  const streak = getStreak(updates);
  const recentUpdates = updates.slice(0, 5);

  const todayKey = new Date().toISOString().slice(0, 10);
  const shippedToday = updates.some(
    (u) => new Date(u.created_at).toISOString().slice(0, 10) === todayKey
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">
              {shippedToday ? "Keep it up." : "Hey — what did you ship today?"}
            </h1>
            {streak > 1 && (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                <Flame className="h-3 w-3" /> {streak} day streak
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {profile?.product_name
              ? `Marketing for ${profile.product_name}`
              : "Set up your product to get started"}
          </p>
        </div>
        <Link href="/new-update">
          <Button className="bg-white text-black hover:bg-zinc-200">
            <PlusCircle className="h-4 w-4 mr-2" />
            New update
          </Button>
        </Link>
      </div>

      {/* No profile CTA */}
      {!profile && (
        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-white mb-1">Finish your setup</p>
              <p className="text-sm text-zinc-500">Add your product details so content sounds specific, not generic.</p>
            </div>
            <Link href="/onboarding">
              <Button className="bg-white text-black hover:bg-zinc-200 shrink-0">
                Complete setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-600 uppercase tracking-widest font-normal flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{totalUpdates}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-600 uppercase tracking-widest font-normal flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> Posts made
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{postsGenerated}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-600 uppercase tracking-widest font-normal flex items-center gap-1.5">
              <Flame className="h-3 w-3" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{streak}<span className="text-sm text-zinc-600 font-normal ml-1">days</span></p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-600 uppercase tracking-widest font-normal flex items-center gap-1.5">
              <BarChart2 className="h-3 w-3" /> Voice
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold capitalize">{profile?.brand_voice ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-5 gap-6">
        {/* Recent updates - left col */}
        <div className="sm:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Recent updates</h2>
            {totalUpdates > 5 && (
              <Link href="/history" className="text-xs text-zinc-600 hover:text-white transition-colors">
                View all →
              </Link>
            )}
          </div>

          {totalUpdates === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm mb-4">No updates yet. Ship something.</p>
                <Link href="/new-update">
                  <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
                    Ship your first update
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((update) => (
                <Link key={update.id} href="/history">
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{update.raw_update}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {new Date(update.created_at).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                          })}
                          {" · "}5 posts generated
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right col - quick actions + prompts */}
        <div className="sm:col-span-2 space-y-4">
          {/* Quick actions */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick actions</h2>
            <div className="space-y-2">
              <Link href="/new-update" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors">
                  <Zap className="h-4 w-4 text-white shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">New update</p>
                    <p className="text-xs text-zinc-600">Generate content now</p>
                  </div>
                </div>
              </Link>
              <Link href="/history" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors">
                  <BarChart2 className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">View history</p>
                    <p className="text-xs text-zinc-600">All {totalUpdates} updates</p>
                  </div>
                </div>
              </Link>
              <Link href="/settings" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors">
                  <Settings className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Settings</p>
                    <p className="text-xs text-zinc-600">Voice & product profile</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Prompt ideas */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Need inspiration?</h2>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <Link
                  key={prompt}
                  href={`/new-update?q=${encodeURIComponent(prompt)}`}
                  className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-zinc-950 leading-relaxed"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
