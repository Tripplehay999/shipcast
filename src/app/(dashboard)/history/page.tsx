import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";
import { HistoryList } from "@/components/history-list";

export default async function HistoryPage() {
  const { userId } = await auth();

  const [{ data: updates }, plan] = await Promise.all([
    supabaseAdmin
      .from("updates")
      .select("*, generated_content(*)")
      .eq("clerk_user_id", userId!)
      .order("created_at", { ascending: false }),
    getUserPlan(userId!),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-zinc-500 text-sm mt-1">
          All your updates and the content generated from them.
        </p>
      </div>
      <HistoryList updates={updates ?? []} plan={plan} />
    </div>
  );
}
