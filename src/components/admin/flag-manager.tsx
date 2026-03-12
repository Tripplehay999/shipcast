"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  plans: string[];
  updated_at: string;
  created_at: string;
}

const PLAN_CHIPS: Record<string, string> = {
  pro:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  studio: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  free:   "bg-zinc-800 text-zinc-400 border-zinc-700",
};

function FlagRow({ flag, onUpdate }: { flag: FeatureFlag; onUpdate: (f: FeatureFlag) => void }) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, enabled: !flag.enabled }),
      });
      const data = await res.json().catch(() => ({})) as { flag?: FeatureFlag; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onUpdate(data.flag!);
      toast.success(`${flag.name} ${!flag.enabled ? "enabled" : "disabled"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const isGlobal = flag.plans.length === 0;
  const isMaintenance = flag.name === "maintenance_mode";

  return (
    <div className={`flex items-center gap-4 px-4 py-4 border-b border-zinc-800/50 last:border-0 ${
      isMaintenance && flag.enabled ? "bg-red-950/20" : ""
    }`}>
      {/* Toggle */}
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none ${
          flag.enabled ? "bg-white" : "bg-zinc-700"
        } disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
          flag.enabled ? "translate-x-5 bg-black" : "translate-x-0.5 bg-zinc-400"
        }`} />
        {loading && (
          <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-zinc-400" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white text-sm font-mono font-medium">{flag.name}</p>
          {isMaintenance && flag.enabled && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium">
              ⚠ APP IN MAINTENANCE
            </span>
          )}
          {isGlobal ? (
            <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded-full">
              all plans
            </span>
          ) : (
            flag.plans.map((p) => (
              <span key={p} className={`text-[10px] border px-1.5 py-0.5 rounded-full ${PLAN_CHIPS[p] ?? ""}`}>
                {p}
              </span>
            ))
          )}
        </div>
        {flag.description && (
          <p className="text-zinc-500 text-xs mt-0.5">{flag.description}</p>
        )}
      </div>

      {/* Status text */}
      <div className="shrink-0 text-right">
        <p className={`text-xs font-medium ${flag.enabled ? "text-emerald-400" : "text-zinc-600"}`}>
          {flag.enabled ? "enabled" : "disabled"}
        </p>
        <p className="text-[10px] text-zinc-700 mt-0.5">
          {new Date(flag.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}

function NewFlagForm({ onCreated }: { onCreated: (f: FeatureFlag) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plans, setPlans] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const togglePlan = (p: string) =>
    setPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, plans, enabled: false }),
      });
      const data = await res.json().catch(() => ({})) as { flag?: FeatureFlag; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(data.flag!);
      toast.success(`Flag "${data.flag!.name}" created`);
      setName(""); setDescription(""); setPlans([]); setOpen(false);
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
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> New flag
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3 max-w-md">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-white">New Feature Flag</p>
        <button type="button" onClick={() => setOpen(false)}><X className="h-4 w-4 text-zinc-600" /></button>
      </div>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
        placeholder="flag_name"
        className="w-full bg-zinc-800 border border-zinc-700 text-white font-mono text-sm rounded-lg px-3 py-2 focus:outline-none"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none placeholder:text-zinc-600"
      />
      <div>
        <p className="text-xs text-zinc-600 mb-1.5">Plan gating (leave empty for all)</p>
        <div className="flex gap-2">
          {["free", "pro", "studio"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlan(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                plans.includes(p)
                  ? "border-white text-white bg-zinc-800"
                  : "border-zinc-700 text-zinc-600 hover:border-zinc-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs py-1.5 border border-zinc-700 text-zinc-500 rounded-lg">Cancel</button>
        <button type="submit" disabled={loading || !name} className="flex-1 text-xs py-1.5 bg-white text-black font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Create
        </button>
      </div>
    </form>
  );
}

export function FlagManager({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);

  const updateFlag = (updated: FeatureFlag) =>
    setFlags((prev) => prev.map((f) => f.id === updated.id ? updated : f));

  const addFlag = (f: FeatureFlag) => setFlags((prev) => [...prev, f]);

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          {enabledCount} of {flags.length} flags enabled
        </p>
        <NewFlagForm onCreated={addFlag} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {flags.map((flag) => (
          <FlagRow key={flag.id} flag={flag} onUpdate={updateFlag} />
        ))}
      </div>
    </div>
  );
}
