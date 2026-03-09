"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Check, Trash2, Tag, Plus, X } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  plan: string;
  duration_days: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
  redemptions?: [{ count: number }];
}

function CouponStatusBadge({ coupon }: { coupon: Coupon }) {
  const now = new Date();
  const expired = coupon.expires_at && new Date(coupon.expires_at) < now;
  const depleted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;

  if (!coupon.active || expired || depleted) {
    const reason = !coupon.active ? "inactive" : expired ? "expired" : "depleted";
    return (
      <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-500 px-2 py-0.5 rounded-full">
        {reason}
      </span>
    );
  }
  return (
    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
      active
    </span>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-zinc-600 hover:text-zinc-300 transition-colors ml-1" title="Copy code">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CreateCouponForm({ onCreated }: { onCreated: (coupon: Coupon) => void }) {
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState("pro");
  const [durationDays, setDurationDays] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim() || undefined,
          plan,
          duration_days: durationDays ? parseInt(durationDays) : null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          expires_at: expiresAt || null,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; coupon?: Coupon };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(data.coupon!);
      toast.success(`Coupon ${data.coupon?.code} created`);
      setCode(""); setDurationDays(""); setMaxUses(""); setExpiresAt(""); setNote("");
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
        <Plus className="h-3.5 w-3.5" />
        Create Coupon
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">New Coupon</p>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Code */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Code (auto if blank)</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. LAUNCH50"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600 uppercase"
          />
        </div>

        {/* Plan */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Grant Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none appearance-none"
          >
            <option value="pro">Pro</option>
            <option value="studio">Studio</option>
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Duration (days, blank = forever)</label>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="e.g. 30"
            min="1"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>

        {/* Max uses */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Max Uses (blank = unlimited)</label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="e.g. 100"
            min="1"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Expires at */}
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Expires At (optional)</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none w-full"
        />
      </div>

      {/* Note */}
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Internal Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. ProductHunt launch promo"
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-500 hover:text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-white text-black font-medium hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
          Create
        </button>
      </div>
    </form>
  );
}

export function CouponManager({
  initialCoupons,
  adminId,
}: {
  initialCoupons: Coupon[];
  adminId: string;
}) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const deactivate = async (id: string, code: string) => {
    if (!confirm(`Deactivate coupon ${code}? Users can no longer redeem it.`)) return;
    setDeactivating(id);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
      toast.success(`Coupon ${code} deactivated`);
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setDeactivating(null);
    }
  };

  const addCoupon = (coupon: Coupon) => {
    setCoupons((prev) => [coupon, ...prev]);
  };

  const activeCoupons = coupons.filter((c) => c.active);
  const inactiveCoupons = coupons.filter((c) => !c.active);

  return (
    <div className="space-y-6">
      <CreateCouponForm onCreated={addCoupon} />

      {/* Active coupons */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Active ({activeCoupons.length})</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Code</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Plan</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Duration</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Uses</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Expires</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Note</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {activeCoupons.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-600 text-sm">
                    No active coupons. Create one above.
                  </td>
                </tr>
              )}
              {activeCoupons.map((c) => (
                <tr key={c.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-white text-sm font-medium tracking-wide">{c.code}</span>
                    <CopyCode code={c.code} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${
                      c.plan === "studio"
                        ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {c.duration_days ? `${c.duration_days}d` : "forever"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums">
                    {c.used_count}
                    <span className="text-zinc-600"> / {c.max_uses ?? "∞"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {c.expires_at
                      ? new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 max-w-[140px] truncate" title={c.note ?? undefined}>
                    {c.note ?? "—"}
                  </td>
                  <td className="px-4 py-3"><CouponStatusBadge coupon={c} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deactivate(c.id, c.code)}
                      disabled={deactivating === c.id}
                      className="text-zinc-700 hover:text-red-400 transition-colors"
                      title="Deactivate"
                    >
                      {deactivating === c.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inactive */}
      {inactiveCoupons.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Inactive / Expired ({inactiveCoupons.length})</p>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden opacity-60">
            <table className="w-full text-sm">
              <tbody>
                {inactiveCoupons.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800/30 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-zinc-500 text-sm line-through">{c.code}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-600 capitalize">{c.plan}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-700">
                      {c.used_count} redeemed
                    </td>
                    <td className="px-4 py-2.5"><CouponStatusBadge coupon={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
