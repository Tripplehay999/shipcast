import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";
import { PlanGate } from "@/components/plan-gate";
import { ContentCalendar } from "@/components/content-calendar";

export default async function SchedulePage() {
  const { userId } = await auth();
  const plan = await getUserPlan(userId!);

  const { data: posts } = await supabaseAdmin
    .from("scheduled_posts")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("scheduled_at", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Post Queue</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Scheduled posts across Twitter, LinkedIn, and Threads. Studio plan only.
        </p>
      </div>

      <PlanGate requiredPlan="studio" currentPlan={plan} featureName="Auto-scheduling & direct posting">
        <ContentCalendar posts={posts ?? []} />
      </PlanGate>
    </div>
  );
}
