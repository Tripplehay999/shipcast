"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function NewTicketForm({
  users,
  adminId,
}: {
  users: { id: string; name: string }[];
  adminId: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim() || undefined,
          user_clerk_id: userId || undefined,
          priority,
          assigned_to: assignedTo.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Ticket created");
      router.push("/admin/tickets");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create ticket");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      {/* Subject */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500 uppercase tracking-widest">Subject *</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of the issue"
          required
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500 uppercase tracking-widest">Details</label>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Full description, error messages, reproduction steps…"
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* User */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 uppercase tracking-widest">User (optional)</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none appearance-none"
          >
            <option value="">— Internal ticket —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 uppercase tracking-widest">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none appearance-none"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </div>
      </div>

      {/* Assigned to */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500 uppercase tracking-widest">Assign to (Clerk user ID or name)</label>
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Leave blank to assign to self"
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm border border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !subject.trim()}
          className="px-4 py-2 text-sm bg-white text-black font-medium hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Create Ticket
        </button>
      </div>
    </form>
  );
}
