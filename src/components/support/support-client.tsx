"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X, MessageSquare } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed:      "bg-zinc-800 text-zinc-500 border-zinc-700",
};

const TICKET_TYPES = [
  { value: "bug",          label: "Bug / Something broken" },
  { value: "billing",      label: "Billing / Account issue" },
  { value: "feature",      label: "Feature request" },
  { value: "integration",  label: "Integration help" },
  { value: "general",      label: "General question" },
];

interface Ticket {
  id: string;
  subject: string;
  body: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function NewTicketForm({ onCreated }: { onCreated: (t: Ticket) => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() || undefined, type }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; ticket?: Ticket };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      onCreated(data.ticket!);
      toast.success("Support ticket submitted. We'll get back to you soon.");
      setSubject(""); setBody(""); setType("general");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <p className="text-sm font-medium text-white">New Ticket</p>

      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500">What&apos;s this about?</label>
        <div className="grid grid-cols-2 gap-2">
          {TICKET_TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                type === t.value
                  ? "border-zinc-500 bg-zinc-800 text-white"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500">Subject *</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          required
          maxLength={200}
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500">Details (optional)</label>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Any additional context, steps to reproduce, or error messages…"
          maxLength={5000}
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600 resize-none"
        />
        {body.length > 4500 && (
          <p className="text-xs text-zinc-600 text-right">{5000 - body.length} chars left</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !subject.trim()}
        className="w-full py-2.5 text-sm bg-white text-black font-medium hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        {loading ? "Submitting…" : "Submit ticket"}
      </button>

      <p className="text-xs text-zinc-700 text-center">
        We respond within 24 hours on business days. Your ticket is private and only visible to support staff.
      </p>
    </form>
  );
}

export function SupportClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [showForm, setShowForm] = useState(tickets.length === 0);

  const addTicket = (t: Ticket) => {
    setTickets((prev) => [t, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Toggle form */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New ticket
        </button>
      )}

      {showForm && (
        <div className="relative">
          {tickets.length > 0 && (
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <NewTicketForm onCreated={addTicket} />
        </div>
      )}

      {/* Ticket list */}
      {tickets.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Your tickets</p>
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white text-sm font-medium">{ticket.subject}</p>
                  <span className={`shrink-0 text-[10px] border px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[ticket.status] ?? ""}`}>
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                </div>

                {ticket.body && (
                  <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{ticket.body}</p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-zinc-700">
                  <span>#{ticket.id.slice(0, 8)}</span>
                  <span>Submitted {timeAgo(ticket.created_at)}</span>
                  {ticket.resolved_at && (
                    <span className="text-emerald-600">
                      Resolved {timeAgo(ticket.resolved_at)}
                    </span>
                  )}
                  {ticket.status === "open" && (
                    <span className="text-yellow-600">Awaiting response</span>
                  )}
                  {ticket.status === "in_progress" && (
                    <span className="text-blue-400">In progress — we&apos;re working on it</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tickets.length === 0 && !showForm && (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No tickets yet.
        </div>
      )}
    </div>
  );
}
