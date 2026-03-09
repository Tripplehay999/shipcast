import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { AdminUsersTable, type AdminUserRow } from "@/components/admin/users-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  await requireAdmin();

  const { plan: planFilter } = await searchParams;

  const [
    { data: profiles },
    { data: subscriptions },
    { data: updateRows },
    { data: githubConns },
    { data: allFlags },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("clerk_user_id, product_name, brand_voice, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("subscriptions")
      .select("clerk_user_id, plan, status, current_period_end, stripe_customer_id"),
    supabaseAdmin.from("updates").select("clerk_user_id"),
    supabaseAdmin.from("github_connections").select("clerk_user_id"),
    // Active flags only (not yet resolved)
    supabaseAdmin
      .from("user_flags")
      .select("id, clerk_user_id, flag_type, note, created_at")
      .is("resolved_at", null),
  ]);

  // Build lookup maps
  const subMap = new Map(
    (subscriptions ?? []).map((s) => [
      s.clerk_user_id,
      s as { plan: string; status: string; current_period_end: string | null; stripe_customer_id: string | null },
    ])
  );

  const updateMap = new Map<string, number>();
  for (const u of updateRows ?? []) {
    const uid = (u as { clerk_user_id: string }).clerk_user_id;
    updateMap.set(uid, (updateMap.get(uid) ?? 0) + 1);
  }

  const githubSet = new Set((githubConns ?? []).map((g) => (g as { clerk_user_id: string }).clerk_user_id));

  const flagsMap = new Map<string, { id: string; flag_type: string; note: string | null; created_at: string }[]>();
  for (const f of allFlags ?? []) {
    const flag = f as { id: string; clerk_user_id: string; flag_type: string; note: string | null; created_at: string };
    const arr = flagsMap.get(flag.clerk_user_id) ?? [];
    arr.push({ id: flag.id, flag_type: flag.flag_type, note: flag.note, created_at: flag.created_at });
    flagsMap.set(flag.clerk_user_id, arr);
  }

  // Build rows
  let rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const sub = subMap.get(p.clerk_user_id);
    return {
      clerk_user_id: p.clerk_user_id,
      product_name: p.product_name ?? "—",
      brand_voice: p.brand_voice ?? "casual",
      created_at: p.created_at,
      plan: sub?.plan ?? "free",
      sub_status: sub?.status ?? null,
      period_end: sub?.current_period_end ?? null,
      stripe_customer_id: sub?.stripe_customer_id ?? null,
      updates: updateMap.get(p.clerk_user_id) ?? 0,
      github: githubSet.has(p.clerk_user_id),
      active_flags: flagsMap.get(p.clerk_user_id) ?? [],
    };
  });

  if (planFilter && planFilter !== "all") {
    rows = rows.filter((r) => r.plan === planFilter);
  }

  const planCounts = { free: 0, pro: 0, studio: 0 };
  for (const p of (profiles ?? []).map((p) => subMap.get(p.clerk_user_id)?.plan ?? "free")) {
    if (p === "pro") planCounts.pro++;
    else if (p === "studio") planCounts.studio++;
    else planCounts.free++;
  }

  const flaggedCount = (allFlags ?? []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {rows.length} shown · {profiles?.length ?? 0} total
            {flaggedCount > 0 && (
              <span className="ml-2 text-yellow-400 text-xs">⚠ {flaggedCount} active flags</span>
            )}
          </p>
        </div>

        {/* Plan filter */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {(["all", "free", "pro", "studio"] as const).map((p) => (
            <Link
              key={p}
              href={`/admin/users${p === "all" ? "" : `?plan=${p}`}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                (planFilter ?? "all") === p
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
              {p !== "all" && (
                <span className="ml-1.5 text-[10px] text-zinc-600">{planCounts[p]}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <AdminUsersTable initialRows={rows} />
    </div>
  );
}
