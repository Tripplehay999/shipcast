import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { AnnouncementManager } from "@/components/admin/announcement-manager";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();

  const { data: announcements } = await supabaseAdmin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  // Get dismissal counts per announcement
  const { data: dismissals } = await supabaseAdmin
    .from("announcement_dismissals")
    .select("announcement_id");

  const dismissalCounts = new Map<string, number>();
  for (const d of dismissals ?? []) {
    const aid = (d as { announcement_id: string }).announcement_id;
    dismissalCounts.set(aid, (dismissalCounts.get(aid) ?? 0) + 1);
  }

  const enriched = (announcements ?? []).map((a) => ({
    ...a,
    dismissal_count: dismissalCounts.get(a.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Announcements</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Create banners shown inside the app. Target by plan, set dates, add CTAs.
        </p>
      </div>
      <AnnouncementManager initialAnnouncements={enriched} />
    </div>
  );
}
