"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GenerateResponse } from "@/lib/types";
import { ContentTabs } from "@/components/content-tabs";
import { Loader2, Zap } from "lucide-react";

function NewUpdateInner({ plan }: { plan?: "free" | "pro" | "studio" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rawUpdate, setRawUpdate] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const shouldAutoGenerate = useRef(false);

  const handleGenerate = useCallback(async (text?: string) => {
    const update = text ?? rawUpdate;
    if (!update.trim()) return;
    setLoading(true);
    setGenerated(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawUpdate: update }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setGenerated(data.content);
      toast.success("Content generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [rawUpdate]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setRawUpdate(q); return; }

    const prefill = sessionStorage.getItem("shipcast_prefill");
    if (prefill) {
      sessionStorage.removeItem("shipcast_prefill");
      setRawUpdate(prefill);
      shouldAutoGenerate.current = true;
    }
  }, [searchParams]);

  // Auto-generate once rawUpdate is set from prefill
  useEffect(() => {
    if (shouldAutoGenerate.current && rawUpdate.trim()) {
      shouldAutoGenerate.current = false;
      handleGenerate(rawUpdate);
    }
  }, [rawUpdate, handleGenerate]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New update</h1>
        <p className="text-zinc-500 text-sm mt-1">
          What did you ship? Write it in plain English — one sentence is enough.
        </p>
      </div>

      {!generated ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update">What did you build or ship today?</Label>
            <Textarea
              id="update"
              placeholder="e.g. Added invoice analytics to the dashboard so users can track revenue trends and unpaid invoices."
              value={rawUpdate}
              onChange={(e) => setRawUpdate(e.target.value)}
              rows={4}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />
            <p className="text-xs text-zinc-600">
              Tip: Be specific. "Added Stripe payments with webhook support" beats "Added payments".
            </p>
          </div>

          <Button
            className="w-full bg-white text-black hover:bg-zinc-200 h-11"
            onClick={() => handleGenerate()}
            disabled={loading || !rawUpdate.trim()}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating content...</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" />Generate content{rawUpdate.trim() && <span className="ml-2 text-xs text-zinc-500">⌘↵</span>}</>
            )}
          </Button>

          <div className="mt-8">
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Try one of these</p>
            <div className="space-y-2">
              {[
                "Launched dark mode support across the entire app.",
                "Added Stripe subscription billing with annual/monthly toggle.",
                "Fixed a critical bug where invoices weren't sending to Gmail users.",
                "Shipped the public API with rate limiting and API key management.",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setRawUpdate(example)}
                  className="w-full text-left text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-zinc-950"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Your update</p>
            <p className="text-sm text-zinc-300">{rawUpdate}</p>
          </div>

          <ContentTabs content={generated} plan={plan} />

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white bg-transparent"
              onClick={() => { setGenerated(null); setRawUpdate(""); }}
            >
              New update
            </Button>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white bg-transparent"
              onClick={() => handleGenerate()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
            </Button>
            <Button
              className="bg-white text-black hover:bg-zinc-200 ml-auto"
              onClick={() => router.push("/history")}
            >
              View history →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/stripe";

export default async function NewUpdatePage() {
  const { userId } = await auth();
  const plan = await getUserPlan(userId!);
  return (
    <Suspense>
      <NewUpdateInner plan={plan} />
    </Suspense>
  );
}
