"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, ShieldAlert, ShieldOff, ChevronDown } from "lucide-react";

const PLAN_STYLE: Record<string, string> = {
  free:   "bg-zinc-800 text-zinc-400 border-zinc-700",
  pro:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  studio: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  active:   "text-emerald-400",
  canceled: "text-zinc-500",
  past_due: "text-red-400",
};

const FLAG_STYLE: Record<string, string> = {
  spam:        "bg-orange-500/10 text-orange-400 border-orange-500/20",
  abuse:       "bg-red-500/10 text-red-400 border-red-500/20",
  suspicious:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  chargeback:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  banned:      "bg-red-900/40 text-red-300 border-red-800",
};

export interface AdminUserRow {
  clerk_user_id: string;
  product_name: string;
  brand_voice: string;
  created_at: string;
  plan: string;
  sub_status: string | null;
  period_end: string | null;
  stripe_customer_id: string | null;
  updates: number;
  github: boolean;
  active_flags: { id: string; flag_type: string; note: string | null; created_at: string }[];
}

function elapsed(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function PlanSelector({
  userId,
  currentPlan,
  onPlanChanged,
}: {
  userId: string;
  currentPlan: string;
  onPlanChanged: (plan: string) => void;
}) {
  const [selected, setSelected] = useState(currentPlan);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (selected === currentPlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onPlanChanged(selected);
      toast.success(`Plan updated to ${selected}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update plan");
      setSelected(currentPlan);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:border-zinc-600 cursor-pointer"
        >
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="studio">studio</option>
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
      </div>
      {selected !== currentPlan && (
        <button
          onClick={save}
          disabled={saving}
          className="text-[10px] px-2 py-1 rounded-md bg-white text-black font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
          Save
        </button>
      )}
      {selected === currentPlan && (
        <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${PLAN_STYLE[currentPlan] ?? PLAN_STYLE.free}`}>
          {currentPlan}
        </span>
      )}
    </div>
  );
}

function FlagButton({
  userId,
  onFlagged,
}: {
  userId: string;
  onFlagged: (flag: { id: string; flag_type: string; note: string | null; created_at: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [flagType, setFlagType] = useState<string>("suspicious");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_type: flagType, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; flag?: { id: string; flag_type: string; note: string | null; created_at: string } };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onFlagged(data.flag!);
      toast.success(`User flagged: ${flagType}`);
      setOpen(false);
      setNote("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zinc-700 hover:text-red-400 transition-colors p-1 rounded"
        title="Flag user"
      >
        <ShieldAlert className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-zinc-900 border border-zinc-700 rounded-xl p-3 w-56 shadow-xl space-y-2.5">
            <p className="text-xs font-medium text-white">Flag User</p>
            <select
              value={flagType}
              onChange={(e) => setFlagType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="suspicious">suspicious</option>
              <option value="spam">spam</option>
              <option value="abuse">abuse</option>
              <option value="chargeback">chargeback</option>
              <option value="banned">ban user</option>
            </select>
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none placeholder:text-zinc-600"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
                Flag
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResolveFlag({ flagId, userId, onResolved }: { flagId: string; userId: string; onResolved: () => void }) {
  const [loading, setLoading] = useState(false);

  const resolve = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}/flag`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_id: flagId }),
      });
      onResolved();
      toast.success("Flag resolved");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={resolve} disabled={loading} title="Resolve flag" className="text-zinc-700 hover:text-zinc-400 transition-colors">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
    </button>
  );
}

export function AdminUsersTable({ initialRows }: { initialRows: AdminUserRow[] }) {
  const [rows, setRows] = useState<AdminUserRow[]>(initialRows);

  const updatePlan = (userId: string, plan: string) => {
    setRows((prev) => prev.map((r) => r.clerk_user_id === userId ? { ...r, plan } : r));
  };

  const addFlag = (userId: string, flag: { id: string; flag_type: string; note: string | null; created_at: string }) => {
    setRows((prev) => prev.map((r) =>
      r.clerk_user_id === userId
        ? { ...r, active_flags: [...r.active_flags, flag] }
        : r
    ));
  };

  const resolveFlag = (userId: string, flagId: string) => {
    setRows((prev) => prev.map((r) =>
      r.clerk_user_id === userId
        ? { ...r, active_flags: r.active_flags.filter((f) => f.id !== flagId) }
        : r
    ));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">User</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Plan</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Flags</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Voice</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Updates</th>
            <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">GH</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Joined</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Renews</th>
            <th className="px-4 py-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-zinc-600 text-sm">
                No users found
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const isBanned = row.active_flags.some((f) => f.flag_type === "banned");
            return (
              <tr
                key={row.clerk_user_id}
                className={`border-b border-zinc-800/50 last:border-0 transition-colors ${
                  isBanned ? "bg-red-950/10" : "hover:bg-zinc-800/20"
                }`}
              >
                {/* User */}
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium text-sm flex items-center gap-1.5">
                      {row.product_name}
                      {isBanned && (
                        <span className="text-[9px] text-red-400 bg-red-900/40 border border-red-800 px-1.5 py-0.5 rounded-full font-medium">BANNED</span>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">{row.clerk_user_id.slice(0, 22)}…</p>
                  </div>
                </td>

                {/* Plan (editable) */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <PlanSelector
                      userId={row.clerk_user_id}
                      currentPlan={row.plan}
                      onPlanChanged={(plan) => updatePlan(row.clerk_user_id, plan)}
                    />
                    {row.sub_status && row.sub_status !== "active" && (
                      <span className={`text-[10px] ${STATUS_STYLE[row.sub_status] ?? "text-zinc-500"}`}>
                        {row.sub_status}
                      </span>
                    )}
                  </div>
                </td>

                {/* Flags */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.active_flags.map((flag) => (
                      <div key={flag.id} className="flex items-center gap-0.5">
                        <span
                          className={`text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${FLAG_STYLE[flag.flag_type] ?? ""}`}
                          title={flag.note ?? undefined}
                        >
                          {flag.flag_type}
                        </span>
                        <ResolveFlag
                          flagId={flag.id}
                          userId={row.clerk_user_id}
                          onResolved={() => resolveFlag(row.clerk_user_id, flag.id)}
                        />
                      </div>
                    ))}
                  </div>
                </td>

                {/* Voice */}
                <td className="px-4 py-3 text-xs text-zinc-500 capitalize">{row.brand_voice}</td>

                {/* Updates */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.updates}</td>

                {/* GitHub */}
                <td className="px-4 py-3 text-center">
                  {row.github ? (
                    <span className="text-emerald-400 text-xs">✓</span>
                  ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </td>

                {/* Joined */}
                <td className="px-4 py-3 text-right text-xs text-zinc-500">{elapsed(row.created_at)}</td>

                {/* Renews */}
                <td className="px-4 py-3 text-right text-xs text-zinc-600">
                  {row.period_end
                    ? new Date(row.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {row.stripe_customer_id && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${row.stripe_customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-zinc-400 transition-colors"
                        title="View in Stripe"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <FlagButton
                      userId={row.clerk_user_id}
                      onFlagged={(flag) => addFlag(row.clerk_user_id, flag)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
