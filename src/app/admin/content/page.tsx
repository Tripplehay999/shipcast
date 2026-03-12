import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { FileText, Twitter, Linkedin, Hash, Code2, BookOpen, Mail, Rss, Newspaper } from "lucide-react";

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  tweet:          <Twitter className="h-3 w-3" />,
  thread:         <Twitter className="h-3 w-3" />,
  linkedin:       <Linkedin className="h-3 w-3" />,
  reddit:         <Hash className="h-3 w-3" />,
  indie_hackers:  <Code2 className="h-3 w-3" />,
  blog_draft:     <BookOpen className="h-3 w-3" />,
  email_body:     <Mail className="h-3 w-3" />,
  changelog_entry: <Rss className="h-3 w-3" />,
};

const FORMAT_COLORS: Record<string, string> = {
  tweet:          "text-sky-400",
  thread:         "text-sky-300",
  linkedin:       "text-blue-400",
  reddit:         "text-orange-400",
  indie_hackers:  "text-emerald-400",
  blog_draft:     "text-violet-400",
  email_body:     "text-amber-400",
  changelog_entry: "text-zinc-400",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function truncate(text: string | null | undefined, len = 120): string {
  if (!text) return "—";
  return text.length > len ? text.slice(0, len) + "…" : text;
}

function countFormats(row: Record<string, unknown>): number {
  const fields = ["tweet", "thread", "linkedin", "reddit", "indie_hackers", "blog_draft", "email_subject", "email_body", "changelog_entry"];
  return fields.filter((f) => {
    const v = row[f];
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdmin();

  const { page: pageStr = "1", q = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const PAGE_SIZE = 30;
  const from = (page - 1) * PAGE_SIZE;

  // Fetch updates with a join on generated_content
  let updatesQuery = supabaseAdmin
    .from("updates")
    .select(
      `id, clerk_user_id, raw_update, created_at,
       generated_content (tweet, thread, linkedin, reddit, indie_hackers, blog_draft, email_subject, email_body, changelog_entry)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (q.trim()) {
    updatesQuery = updatesQuery.ilike("raw_update", `%${q.trim()}%`);
  }

  const { data: updates, count } = await updatesQuery;

  // Fetch product names for users on this page
  const userIds = [...new Set((updates ?? []).map((u) => u.clerk_user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .in("clerk_user_id", userIds.length ? userIds : ["__none__"]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.clerk_user_id, p.product_name ?? "—"])
  );

  // Overall stats
  const [{ count: totalUpdates }, { count: totalGenerated }] = await Promise.all([
    supabaseAdmin.from("updates").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("generated_content").select("*", { count: "exact", head: true }),
  ]);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/admin/content?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Content History</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {count ?? 0} updates · {totalGenerated ?? 0} generated pieces total
          </p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <p className="text-lg font-bold tabular-nums">{totalUpdates ?? 0}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Updates</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <p className="text-lg font-bold tabular-nums">{totalGenerated ?? 0}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Pieces</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <p className="text-lg font-bold tabular-nums">
              {totalUpdates && totalGenerated
                ? (totalGenerated / totalUpdates).toFixed(1)
                : "—"}
            </p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Avg/update</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/content" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search raw update text…"
          className="flex-1 max-w-sm bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
        />
        <button
          type="submit"
          className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/content"
            className="px-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest w-2/5">Raw Update</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Formats</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Content Preview</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody>
            {(updates ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  {q ? `No updates matching "${q}"` : "No content yet"}
                </td>
              </tr>
            )}
            {(updates ?? []).map((update) => {
              const gcRaw = Array.isArray(update.generated_content)
                ? update.generated_content[0]
                : update.generated_content;
              const gc = (gcRaw as Record<string, unknown> | null) ?? {};
              const formatCount = countFormats(gc);
              const activeFormats = Object.entries(FORMAT_ICONS).filter(([key]) => {
                const v = gc[key];
                return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
              });

              return (
                <tr key={update.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors align-top">
                  {/* User */}
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{nameMap.get(update.clerk_user_id) ?? "—"}</p>
                    <p className="text-[10px] text-zinc-700 font-mono mt-0.5">{update.clerk_user_id.slice(0, 12)}…</p>
                  </td>

                  {/* Raw update */}
                  <td className="px-4 py-3">
                    <p className="text-zinc-300 text-xs leading-relaxed line-clamp-3">
                      {update.raw_update}
                    </p>
                    <p className="text-[10px] text-zinc-700 mt-1 font-mono">#{update.id.slice(0, 8)}</p>
                  </td>

                  {/* Format icons */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {activeFormats.map(([key, icon]) => (
                        <span
                          key={key}
                          title={key.replace(/_/g, " ")}
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 ${FORMAT_COLORS[key] ?? "text-zinc-400"}`}
                        >
                          {icon}
                          <span className="hidden sm:inline">{key.replace(/_/g, " ")}</span>
                        </span>
                      ))}
                      {formatCount === 0 && (
                        <span className="text-xs text-zinc-700 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> none
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tweet preview */}
                  <td className="px-4 py-3 max-w-xs">
                    {gc.tweet ? (
                      <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                        {truncate(gc.tweet as string, 100)}
                      </p>
                    ) : gc.linkedin ? (
                      <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                        {truncate(gc.linkedin as string, 100)}
                      </p>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-right text-xs text-zinc-600 whitespace-nowrap">
                    {fmtDate(update.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={buildHref(page - 1)}
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
            href={buildHref(page + 1)}
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
