"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function TicketActions({
  ticketId,
  currentStatus,
  currentPriority,
  adminId,
}: {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  adminId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Ticket updated");
      setNote("");
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        Edit
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-60 shadow-xl space-y-3">
            <p className="text-xs font-medium text-white">Update Ticket</p>

            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Status</p>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Priority</p>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Add Note</p>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note…"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none placeholder:text-zinc-600 resize-none"
              />
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 text-xs py-1.5 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
