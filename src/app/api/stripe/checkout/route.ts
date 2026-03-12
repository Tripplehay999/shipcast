import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { PLANS, Plan } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await req.json() as { plan: Plan };
    if (plan === "free") return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const priceId = PLANS[plan].stripePriceId;
    if (!priceId) return NextResponse.json({ error: "Plan not configured" }, { status: 500 });

    // Get or create Stripe customer
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("clerk_user_id", userId)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,   // shows promo code field at Stripe checkout
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { clerk_user_id: userId, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
