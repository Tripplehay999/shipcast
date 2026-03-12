import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { FlagManager } from "@/components/admin/flag-manager";

export default async function AdminFlagsPage() {
  await requireAdmin();

  const { data: flags } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Feature Flags</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Toggle features on/off without a deploy. Changes take effect immediately.
        </p>
      </div>
      <FlagManager initialFlags={flags ?? []} />
    </div>
  );
}
