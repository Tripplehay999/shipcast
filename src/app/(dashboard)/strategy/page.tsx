import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { StrategyClient } from "./strategy-client";

export default async function StrategyPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, product_link")
    .eq("clerk_user_id", userId)
    .single();

  return (
    <StrategyClient
      savedUrl={(profile?.product_link as string | null) ?? null}
      productName={(profile?.product_name as string | null) ?? null}
    />
  );
}
