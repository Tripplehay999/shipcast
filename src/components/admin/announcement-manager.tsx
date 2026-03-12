"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, Eye, EyeOff } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  target_plans: string[];
  active: boolean;
  dismissible: boolean;
  starts_at: string | null;
  ends_at: string | null;
  cta_label: string | null;
  cta_href: string | null;
  created_at: string;
  dismissal_count: number;
}

const TYPE_STYLE: Record<string, string> = {
  info:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error:   "bg-red-500/10 text-red-400 border-red-500/20",
};

const TYPE_BAR: Record<string, string> = {
  info:    "border-l-blue-400 bg-blue-500/5",
  warning: "border-l-amber-400 bg-amber-500/5",
  success: "border-l-emerald-400 bg-emerald-500/5",
  error:   "border-l-red-400 bg-red-500/5",
};

function AnnouncementRow({
  a,
  onUpdate,
  onDelete,
}: {
  a: Announcement;
  onUpdate: (updated: Announcement) => void;
  onDelete: (id: string) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleActive = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, active: !a.active }),
      });
      const data = await res.json().catch(() => ({})) as { announcement?: Announcement; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onUpdate(data.announcement!);
      toast.success(a.active ? "Announcement hidden" : "Announcement is now live");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setToggling(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(true);
    try {
      await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id }),
      });
      onDelete(a.id);
      toast.success("Deleted");
    } finally {
      setDeleting(false);
    }
  };

  const isLive = a.active;
  const now = new Date();
  const expired = a.ends_at && new Date(a.ends_at) < now;
  const notStarted = a.starts_at && new Date(a.starts_at) > now;

  return (
    <div className={`border-l-4 rounded-xl p-4 bg-zinc-900 border border-zinc-800 space-y-2 ${TYPE_BAR[a.type] ?? TYPE_BAR.info}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[a.type] ?? ""}`}>
              {a.type}
            </span>
            {isLive && !expired && !notStarted && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                LIVE
              </span>
            )}
            {expired && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">expired</span>
            )}
            {notStarted && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">scheduled</span>
            )}
            {a.target_plans.length > 0 ? (
              a.target_plans.map((p) => (
                <span key={p} className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded-full capitalize">{p} only</span>
              ))
            ) : (
              <span className="text-[10px] text-zinc-700">all users</span>
            )}
            <span className="text-[10px] text-zinc-700">{a.dismissal_count} dismissed</span>
          </div>
          <p className="text-white text-sm font-medium">{a.title}</p>
          {a.body && <p className="text-zinc-500 text-xs line-clamp-2">{a.body}</p>}
          {a.cta_label && (
            <p className="text-xs text-zinc-600">CTA: "{a.cta_label}" → {a.cta_href}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleActive}
            disabled={toggling}
            title={isLive ? "Hide" : "Make live"}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLive
                ? "border-emerald-700 text-emerald-400 hover:border-zinc-700 hover:text-zinc-400"
                : "border-zinc-700 text-zinc-500 hover:border-emerald-700 hover:text-emerald-400"
            }`}
          >
            {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isLive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={del}
            disabled={deleting}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-600 hover:border-red-800 hover:text-red-400 transition-colors"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewAnnouncementForm({ onCreated }: { onCreated: (a: Announcement) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [plans, setPlans] = useState<string[]>([]);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dismissible, setDismissible] = useState(true);
  const [loading, setLoading] = useState(false);

  const togglePlan = (p: string) => setPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, body: body || undefined, type, target_plans: plans,
          cta_label: ctaLabel || undefined, cta_href: ctaHref || undefined,
          ends_at: endsAt || undefined, dismissible,
        }),
      });
      const data = await res.json().catch(() => ({})) as { announcement?: Announcement; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated({ ...data.announcement!, dismissal_count: 0 });
      toast.success("Announcement created (inactive). Toggle it live when ready.");
      setTitle(""); setBody(""); setPlans([]); setCtaLabel(""); setCtaHref(""); setEndsAt("");
      setOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> New Announcement
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex justify-between">
        <p className="text-sm font-medium text-white">New Announcement</p>
        <button type="button" onClick={() => setOpen(false)}><X className="h-4 w-4 text-zinc-600" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none placeholder:text-zinc-600" />
        </div>
        <div className="col-span-2">
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (optional)" className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none placeholder:text-zinc-600 resize-none" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 block mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none appearance-none">
            {["info", "warning", "success", "error"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 block mb-1">Expires (optional)</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 block mb-1">CTA Button Label</label>
          <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. Upgrade now" className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none placeholder:text-zinc-600" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 block mb-1">CTA URL</label>
          <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/pricing" className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none placeholder:text-zinc-600" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-600 block mb-1.5">Target plans (empty = all)</label>
        <div className="flex gap-2">
          {["free", "pro", "studio"].map((p) => (
            <button key={p} type="button" onClick={() => togglePlan(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${plans.includes(p) ? "border-white text-white bg-zinc-800" : "border-zinc-700 text-zinc-600"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={dismissible} onChange={(e) => setDismissible(e.target.checked)} className="rounded" />
        Users can dismiss this banner
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs py-1.5 border border-zinc-700 text-zinc-500 rounded-lg">Cancel</button>
        <button type="submit" disabled={loading || !title} className="flex-1 text-xs py-1.5 bg-white text-black font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Create
        </button>
      </div>
    </form>
  );
}

export function AnnouncementManager({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const [items, setItems] = useState<Announcement[]>(initialAnnouncements);

  const liveCount = items.filter((a) => a.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">{liveCount} live · {items.length} total</p>
        <NewAnnouncementForm onCreated={(a) => setItems((prev) => [a, ...prev])} />
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-zinc-600 text-sm bg-zinc-900/40 border border-zinc-800 rounded-xl">
          No announcements yet.
        </div>
      )}
      <div className="space-y-2">
        {items.map((a) => (
          <AnnouncementRow
            key={a.id}
            a={a}
            onUpdate={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? { ...updated, dismissal_count: i.dismissal_count } : i))}
            onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
