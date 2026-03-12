"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Tag, Check } from "lucide-react";

const PLAN_BADGE: Record<string, string> = {
  pro:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  studio: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

export function CouponRedeem({ currentPlan }: { currentPlan: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState<{ plan: string; expires_at: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        plan?: string;
        expires_at?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      setRedeemed({ plan: data.plan!, expires_at: data.expires_at! });
      toast.success(data.message ?? `Upgraded to ${data.plan}!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Redemption failed");
    } finally {
      setLoading(false);
    }
  };

  if (redeemed) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
        <Check className="h-5 w-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-white text-sm font-medium">
            Code redeemed!{" "}
            <span className={`text-[11px] border px-2 py-0.5 rounded-full font-medium ml-1 ${PLAN_BADGE[redeemed.plan] ?? ""}`}>
              {redeemed.plan}
            </span>
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {redeemed.expires_at === "never"
              ? "Your upgrade is permanent."
              : `Active until ${new Date(redeemed.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`}
          </p>
        </div>
      </div>
    );
  }

  if (currentPlan === "studio") {
    return (
      <p className="text-zinc-600 text-sm">
        You&apos;re already on the Studio plan — no code needed.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER-CODE"
          maxLength={32}
          className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm font-mono rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700 uppercase tracking-wide"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="px-4 py-2.5 text-sm bg-white text-black font-medium hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Redeem
      </button>
    </form>
  );
}
