import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";
import { SettingsForm } from "@/components/settings-form";
import { CouponRedeem } from "@/components/settings/coupon-redeem";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default async function SettingsPage() {
  const { userId } = await auth();

  const [{ data: profile }, plan] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("clerk_user_id", userId!).single(),
    getUserPlan(userId!),
  ]);

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Update your product profile and brand voice.</p>
      </div>

      <SettingsForm profile={profile} />

      {/* Coupon / promo code redemption */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">Redeem a Code</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Have a promo code? Enter it here to unlock a plan upgrade.
          </p>
        </div>
        <CouponRedeem currentPlan={plan} />
      </section>

      {/* Support link */}
      <section className="border-t border-zinc-800 pt-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">Need help?</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Submit a support ticket and we&apos;ll get back to you within 24 hours.
            </p>
          </div>
          <Link
            href="/support"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Open support
          </Link>
        </div>
      </section>
    </div>
  );
}
