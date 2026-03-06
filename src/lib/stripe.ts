import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function getUserPlan(clerkUserId: string): Promise<"free" | "pro" | "studio"> {
  const { supabaseAdmin } = await import("./supabase");
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!data || data.status !== "active") return "free";
  return data.plan as "free" | "pro" | "studio";
}
