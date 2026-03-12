import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

const PLATFORM_COLOR: Record<string, string> = {
  twitter:  "text-sky-400",
  linkedin: "text-blue-400",
  threads:  "text-purple-400",
  github:   "text-zinc-400",
};

/** Mask a token: show first 6 + last 4 chars only */
function maskToken(token: string | null): string {
  if (!token) return "—";
  if (token.length <= 12) return "••••••••";
  return token.slice(0, 6) + "••••••••" + token.slice(-4);
}

function isExpired(expiresAt: string | null) {
  return expiresAt && new Date(expiresAt) < new Date();
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminSocialPage() {
  await requireAdmin();

  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from("connected_accounts")
      .select("id, clerk_user_id, platform, platform_user_id, platform_username, access_token, expires_at, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("clerk_user_id, product_name"),
  ]);

  const nameMap = new Map((profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"]));

  // Stats
  const platformCounts: Record<string, number> = {};
  const expiredCount = (accounts ?? []).filter((a) => isExpired((a as { expires_at: string | null }).expires_at)).length;

  for (const a of accounts ?? []) {
    const p = (a as { platform: string }).platform;
    platformCounts[p] = (platformCounts[p] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Social Integrations</h1>
        <p className="text-zinc-500 text-sm mt-1">
          All connected social accounts across users. Tokens are masked for privacy.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 flex-wrap">
        {Object.entries(platformCounts).map(([platform, count]) => (
          <div key={platform} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 min-w-[100px]">
            <p className={`text-xs font-medium capitalize ${PLATFORM_COLOR[platform] ?? "text-zinc-400"}`}>{platform}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{count}</p>
          </div>
        ))}
        {expiredCount > 0 && (
          <div className="bg-red-950/30 border border-red-900/40 rounded-xl px-5 py-4 min-w-[120px]">
            <p className="text-xs font-medium text-red-400">Expired tokens</p>
            <p className="text-2xl font-bold tabular-nums text-red-300 mt-1">{expiredCount}</p>
            <p className="text-[10px] text-red-600 mt-0.5">users need to reconnect</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Platform</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Account</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Token (masked)</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Expires</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Connected</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">No connected accounts</td></tr>
            )}
            {(accounts ?? []).map((acc) => {
              const a = acc as {
                id: string; clerk_user_id: string; platform: string; platform_user_id: string | null;
                platform_username: string | null; access_token: string | null; expires_at: string | null; created_at: string;
              };
              const expired = isExpired(a.expires_at);
              return (
                <tr key={a.id} className={`border-b border-zinc-800/50 last:border-0 transition-colors ${expired ? "bg-red-950/10" : "hover:bg-zinc-800/20"}`}>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{nameMap.get(a.clerk_user_id) ?? "—"}</p>
                    <p className="text-[10px] text-zinc-700 font-mono">{a.clerk_user_id.slice(0, 16)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${PLATFORM_COLOR[a.platform] ?? "text-zinc-400"}`}>
                      {a.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-300 text-xs">{a.platform_username ?? "—"}</p>
                    {a.platform_user_id && (
                      <p className="text-[10px] text-zinc-700 font-mono">id: {a.platform_user_id}</p>
                    )}
                  </td>
                  {/* PRIVACY: tokens are always masked — we never show raw values */}
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-600">
                    {maskToken(a.access_token)}
                  </td>
                  <td className="px-4 py-3">
                    {a.expires_at ? (
                      <span className={`text-xs ${expired ? "text-red-400" : "text-zinc-500"}`}>
                        {expired ? "⚠ expired" : new Date(a.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">never</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-600">{timeAgo(a.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-700">
        ⓘ Access tokens are masked (first 6 + last 4 characters only) and are never transmitted to the browser in full. Raw tokens are stored encrypted server-side.
      </p>
    </div>
  );
}
