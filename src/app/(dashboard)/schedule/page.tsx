import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ContentCalendar } from "@/components/content-calendar";
import { Clock, AlertCircle } from "lucide-react";

export default async function SchedulePage() {
  const { userId } = await auth();

  const [{ data: posts }, { data: sub }] = await Promise.all([
    supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("clerk_user_id", userId!)
      .order("scheduled_at", { ascending: true }),
    supabaseAdmin
      .from("subscriptions")
      .select("plan")
      .eq("clerk_user_id", userId!)
      .single(),
  ]);

  const plan = sub?.plan ?? "free";
  const isStudio = plan === "studio";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Post Queue</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Your scheduled posts across Twitter, LinkedIn, and Threads.
        </p>
      </div>

      {/* Requires: Studio plan */}
      {!isStudio && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300 mb-0.5">Studio plan required to schedule posts</p>
            <p className="text-xs text-zinc-500">
              Upgrade to Studio to schedule posts directly to Twitter, LinkedIn, and Threads.{" "}
              <a href="/pricing" className="text-zinc-400 hover:text-white underline">View plans →</a>
            </p>
          </div>
        </div>
      )}

      {/* Requires: Vercel deployment for auto-posting cron */}
      {isDev && (
        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
          <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-0.5">Auto-posting requires Vercel deployment</p>
            <p className="text-xs text-zinc-500">
              The cron job (<code className="text-zinc-400 bg-zinc-900 px-1 rounded">/api/cron/post</code>) runs daily at 9am UTC on Vercel.
              In local dev, posts won&apos;t be sent automatically — trigger manually at{" "}
              <code className="text-zinc-400 bg-zinc-900 px-1 rounded">GET /api/cron/post</code> with your <code className="text-zinc-400 bg-zinc-900 px-1 rounded">CRON_SECRET</code>.
            </p>
          </div>
        </div>
      )}

      <ContentCalendar posts={posts ?? []} />
    </div>
  );
}
