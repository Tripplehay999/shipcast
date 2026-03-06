"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Check, Loader2, UserCircle2, Twitter, Linkedin, Github, Globe, Zap } from "lucide-react";

interface Bios {
  twitter: string;
  linkedin_headline: string;
  linkedin_about: string;
  product_hunt: string;
  github: string;
  indie_hackers: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function BioCard({ icon: Icon, label, value, color = "text-zinc-400" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600 font-mono">{value.replace(/\\n/g, "\n").length} chars</span>
          <CopyButton text={value.replace(/\\n/g, "\n")} />
        </div>
      </div>
      <div className="px-4 py-4 bg-zinc-950">
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{value.replace(/\\n/g, "\n")}</p>
      </div>
    </div>
  );
}

export default function BioPage() {
  const [role, setRole] = useState("");
  const [hook, setHook] = useState("");
  const [loading, setLoading] = useState(false);
  const [bios, setBios] = useState<Bios | null>(null);

  const generate = async () => {
    if (!role.trim()) { toast.error("Describe your role first."); return; }
    setLoading(true);
    setBios(null);
    try {
      const res = await fetch("/api/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, hook }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setBios(data.bios);
      toast.success("Bios generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <UserCircle2 className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">Bio Generator</h1>
        </div>
        <p className="text-zinc-500 text-sm">
          Generate optimized bios for every platform — Twitter, LinkedIn, Product Hunt, GitHub, and Indie Hackers — in your brand voice.
        </p>
      </div>

      {!bios && (
        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <Label className="text-sm text-zinc-300">Who are you? *</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Solo founder building Shipcast, formerly at Stripe"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-500">
              What&apos;s your hook? <span className="text-zinc-600">(optional)</span>
            </Label>
            <Textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              rows={2}
              placeholder="Your unique angle, interesting background, or mission statement…"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-sm"
            />
          </div>
          <Button
            onClick={generate}
            disabled={loading || !role.trim()}
            className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating bios…</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" />Generate bios</>
            )}
          </Button>
        </div>
      )}

      {bios && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Your bios</p>
            <button onClick={() => setBios(null)} className="text-xs text-zinc-600 hover:text-white transition-colors">
              ← Regenerate
            </button>
          </div>

          <BioCard icon={Twitter} label="Twitter / X" value={bios.twitter} color="text-sky-400" />
          <BioCard icon={Linkedin} label="LinkedIn headline" value={bios.linkedin_headline} color="text-blue-400" />
          <BioCard icon={Linkedin} label="LinkedIn About" value={bios.linkedin_about} color="text-blue-400" />
          <BioCard icon={Globe} label="Product Hunt" value={bios.product_hunt} color="text-orange-400" />
          <BioCard icon={Github} label="GitHub" value={bios.github} color="text-zinc-300" />
          <BioCard icon={Globe} label="Indie Hackers" value={bios.indie_hackers} color="text-emerald-400" />
        </div>
      )}
    </div>
  );
}
