import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRight, Rocket } from "lucide-react";
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
  { emoji: "🐛", text: "Fixed a bug that was affecting some users." },
  { emoji: "📈", text: "Added a new onboarding step to reduce drop-off." },
  { emoji: "⚡", text: "Improved loading speed by 40%." },
  { emoji: "💸", text: "Launched a new pricing page." },
  { emoji: "📧", text: "Shipped email notifications for key events." },
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

  const greeting = shippedToday
    ? "Nice — you shipped today 🔥"
    : totalUpdates === 0
    ? "Let's get you started 👋"
    : "What did you ship today?";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{greeting}</h1>
            {streak > 1 && (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                🔥 {streak} day streak
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {profile?.product_name
              ? `${profile.product_name} · ${profile.brand_voice ?? "casual"} voice`
              : "Set up your product to get started"}
          </p>
        </div>
        <Link href="/new-update">
          <Button className="bg-white text-black hover:bg-zinc-200 font-semibold">
            <PlusCircle className="h-4 w-4 mr-2" />
            New update
          </Button>
        </Link>
      </div>

      {/* No profile CTA */}
      {!profile && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center justify-between mb-8">
          <div>
            <p className="font-medium text-white mb-0.5">✨ Finish your setup</p>
            <p className="text-sm text-zinc-400">Add your product details so content sounds specific, not generic.</p>
          </div>
          <Link href="/onboarding">
            <Button className="bg-white text-black hover:bg-zinc-200 shrink-0">
              Complete setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full" />
          <p className="text-xs text-zinc-500 mb-2">📝 Updates shipped</p>
          <p className="text-3xl font-bold text-white">{totalUpdates}</p>
          {totalUpdates === 0 && <p className="text-xs text-zinc-700 mt-1">Start shipping</p>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/5 rounded-bl-full" />
          <p className="text-xs text-zinc-500 mb-2">⚡ Posts generated</p>
          <p className="text-3xl font-bold text-white">{postsGenerated}</p>
          {postsGenerated > 0 && <p className="text-xs text-zinc-700 mt-1">across 5 platforms</p>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 relative overflow-hidden">
          <div className={`absolute top-0 right-0 h-16 w-16 rounded-bl-full ${streak > 0 ? "bg-orange-500/5" : "bg-zinc-800/30"}`} />
          <p className="text-xs text-zinc-500 mb-2">🔥 Day streak</p>
          <p className="text-3xl font-bold text-white">
            {streak}
            <span className="text-sm text-zinc-600 font-normal ml-1">days</span>
          </p>
          {streak === 0 && <p className="text-xs text-zinc-700 mt-1">Ship today to start</p>}
          {streak >= 7 && <p className="text-xs text-orange-500/70 mt-1">On fire 🔥</p>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-bl-full" />
          <p className="text-xs text-zinc-500 mb-2">🎤 Voice style</p>
          <p className="text-xl font-bold text-white capitalize">
            {profile?.brand_voice ?? "—"}
          </p>
          {!profile?.brand_voice && <p className="text-xs text-zinc-700 mt-1">Set in settings</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-6">
        {/* Recent updates */}
        <div className="sm:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Recent updates
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
              <p className="text-zinc-600 text-xs">Write your first update and turn it into content in seconds.</p>
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
                    <span className="text-base shrink-0">{["📦", "✨", "🔧", "🚀", "💡"][i % 5]}</span>
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
          {/* Quick actions */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick actions</h2>
            <div className="space-y-2">
              <Link href="/new-update" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-sm font-medium text-white">New update</p>
                    <p className="text-xs text-zinc-600">Generate content now</p>
                  </div>
                </div>
              </Link>
              <Link href="/launch-kit" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
                  <Rocket className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Launch Kit</p>
                    <p className="text-xs text-zinc-600">Full launch package</p>
                  </div>
                </div>
              </Link>
              <Link href="/connected-accounts" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                  <span className="text-lg">🔗</span>
                  <div>
                    <p className="text-sm font-medium text-white">Connect accounts</p>
                    <p className="text-xs text-zinc-600">Twitter, LinkedIn, Threads</p>
                  </div>
                </div>
              </Link>
              <Link href="/schedule" className="block">
                <div className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="text-sm font-medium text-white">Post queue</p>
                    <p className="text-xs text-zinc-600">Schedule posts</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Prompt ideas */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              💡 Need a prompt?
            </h2>
            <div className="space-y-1.5">
              {quickPrompts.map(({ emoji, text }) => (
                <Link
                  key={text}
                  href={`/new-update?q=${encodeURIComponent(text)}`}
                  className="flex items-start gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-zinc-950 leading-relaxed"
                >
                  <span className="shrink-0">{emoji}</span>
                  <span>{text}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
