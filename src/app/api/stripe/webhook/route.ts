import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerk_user_id;
      const plan = session.metadata?.plan;
      if (!clerkUserId || !plan) break;

      await supabaseAdmin.from("subscriptions").upsert(
        {
          clerk_user_id: clerkUserId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan,
          status: "active",
        },
        { onConflict: "clerk_user_id" }
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const clerkUserId = sub.metadata?.clerk_user_id;
      if (!clerkUserId) {
        // look up by stripe customer id
        const { data } = await supabaseAdmin
          .from("subscriptions")
          .select("clerk_user_id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();
        if (!data) break;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
            current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_user_id", data.clerk_user_id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("clerk_user_id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      if (!data) break;

      await supabaseAdmin
        .from("subscriptions")
        .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
        .eq("clerk_user_id", data.clerk_user_id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
