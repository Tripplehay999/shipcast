import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { CouponManager } from "@/components/admin/coupon-manager";

export default async function AdminCouponsPage() {
  const adminId = await requireAdmin();

  const { data: coupons } = await supabaseAdmin
    .from("admin_coupons")
    .select("*, redemptions:admin_coupon_redemptions(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Coupons</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Create coupon codes that grant free plan upgrades. Users redeem via Settings.
        </p>
      </div>
      <CouponManager initialCoupons={coupons ?? []} adminId={adminId} />
    </div>
  );
}
