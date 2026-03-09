import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { Twitter, Linkedin, MessageCircle, AlertTriangle } from "lucide-react";

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  twitter:  <Twitter className="h-3 w-3" />,
  linkedin: <Linkedin className="h-3 w-3" />,
  threads:  <MessageCircle className="h-3 w-3" />,
};

const PLATFORM_COLOR: Record<string, string> = {
  twitter:  "text-sky-400",
  linkedin: "text-blue-400",
  threads:  "text-purple-400",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  posted:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed:  "bg-red-500/10 text-red-400 border-red-500/20",
};

type StatusFilter = "all" | "pending" | "posted" | "failed";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();

  const { status: statusFilter = "all", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const PAGE_SIZE = 50;
  const from = (page - 1) * PAGE_SIZE;

  // Build query
  let query = supabaseAdmin
    .from("scheduled_posts")
    .select("id, clerk_user_id, platform, content, scheduled_at, status, posted_at, error, created_at", { count: "exact" })
    .order("scheduled_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: posts, count } = await query;

  // Fetch product names for users in this page
  const userIds = [...new Set((posts ?? []).map((p) => p.clerk_user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", userIds.length ? userIds : ["__none__"]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"])
  );

  // Status counts for tabs
  const [{ count: cPending }, { count: cPosted }, { count: cFailed }] = await Promise.all([
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "posted"),
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Scheduled Posts</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {count ?? 0} posts · page {page} of {totalPages}
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {([
            { key: "all", label: "All", count: (cPending ?? 0) + (cPosted ?? 0) + (cFailed ?? 0) },
            { key: "pending", label: "Pending", count: cPending ?? 0 },
            { key: "posted",  label: "Posted",  count: cPosted ?? 0 },
            { key: "failed",  label: "Failed",  count: cFailed ?? 0 },
          ] as { key: StatusFilter; label: string; count: number }[]).map(({ key, label, count: c }) => (
            <Link
              key={key}
              href={`/admin/posts${key === "all" ? "" : `?status=${key}`}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                (statusFilter ?? "all") === key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-[10px] text-zinc-600">{c}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Failed alert */}
      {(cFailed ?? 0) > 0 && statusFilter !== "failed" && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{cFailed} post{(cFailed ?? 0) > 1 ? "s" : ""} failed to publish. </span>
          <Link href="/admin/posts?status=failed" className="underline hover:text-red-300">
            View failed →
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Platform</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest w-1/3">Content</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Scheduled</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Posted</th>
            </tr>
          </thead>
          <tbody>
            {(posts ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  No posts found
                </td>
              </tr>
            )}
            {(posts ?? []).map((post) => (
              <tr key={post.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                {/* User */}
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white text-sm">{nameMap.get(post.clerk_user_id) ?? "—"}</p>
                    <p className="text-[10px] text-zinc-700 font-mono">{post.clerk_user_id.slice(0, 14)}…</p>
                  </div>
                </td>

                {/* Platform */}
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${PLATFORM_COLOR[post.platform] ?? "text-zinc-400"}`}>
                    {PLATFORM_ICON[post.platform]}
                    <span className="capitalize">{post.platform}</span>
                  </span>
                </td>

                {/* Content */}
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-zinc-300 text-xs line-clamp-2 leading-relaxed">{post.content}</p>
                  {post.error && (
                    <p className="text-red-400 text-[10px] mt-1 truncate" title={post.error}>
                      ✕ {post.error}
                    </p>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[post.status] ?? ""}`}>
                    {post.status}
                  </span>
                </td>

                {/* Scheduled at */}
                <td className="px-4 py-3 text-right text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(post.scheduled_at).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </td>

                {/* Posted at */}
                <td className="px-4 py-3 text-right text-xs text-zinc-700 whitespace-nowrap">
                  {post.posted_at
                    ? new Date(post.posted_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/posts?status=${statusFilter}&page=${page - 1}`}
            className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
              page <= 1 ? "pointer-events-none opacity-30" : ""
            }`}
          >
            ← Previous
          </Link>
          <span className="text-xs text-zinc-600">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/posts?status=${statusFilter}&page=${page + 1}`}
            className={`text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors ${
              page >= totalPages ? "pointer-events-none opacity-30" : ""
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
