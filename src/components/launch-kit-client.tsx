"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Rocket, Loader2 } from "lucide-react";
import { LaunchKitDisplay, LaunchKit } from "@/components/launch-kit-display";

interface Props {
  defaultProductName: string;
}

const LOADING_STEPS = [
  "Analyzing your launch…",
  "Writing social posts…",
  "Crafting Product Hunt copy…",
  "Drafting press release…",
  "Building one-liners…",
  "Generating image prompts…",
  "Finishing up…",
];

function LoadingSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 2800)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-zinc-800 flex items-center justify-center">
          <Rocket className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
      </div>
      <div className="text-center space-y-3">
        <p className="text-white font-medium text-sm">{LOADING_STEPS[step]}</p>
        <div className="flex gap-1 justify-center">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-5 rounded-full transition-all duration-500 ${i <= step ? "bg-white" : "bg-zinc-800"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LaunchKitClient({ defaultProductName }: Props) {
  const [launchDescription, setLaunchDescription] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [kit, setKit] = useState<LaunchKit | null>(null);

  const generate = async () => {
    if (!launchDescription.trim()) {
      toast.error("Describe your launch first.");
      return;
    }
    setLoading(true);
    setKit(null);
    try {
      const res = await fetch("/api/launch-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchDescription, extraContext }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setKit(data.kit);
      toast.success("Launch kit ready.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input form — hidden while loading or showing result */}
      {!kit && !loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-zinc-300">What are you launching?</Label>
            <Textarea
              value={launchDescription}
              onChange={(e) => setLaunchDescription(e.target.value)}
              rows={5}
              placeholder={`Describe your launch in plain English — what it is, who it's for, and what makes it worth talking about.\n\ne.g. "Shipcast turns product updates into ready-to-post social content for solo founders. You type what you shipped, it generates tweets, LinkedIn posts, and threads in your brand voice. Launching today with a free plan."`}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-sm leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
            />
            <p className="text-xs text-zinc-600">The more specific you are, the better the copy. ⌘↵ to generate.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-zinc-500">
              Anything else? <span className="text-zinc-600">(optional)</span>
            </Label>
            <Textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              rows={2}
              placeholder="Pricing, launch date, special offer, traction metrics, press mentions…"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-sm"
            />
          </div>

          <Button
            onClick={generate}
            disabled={!launchDescription.trim()}
            className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Build launch kit
          </Button>
        </div>
      )}

      {loading && <LoadingSteps />}

      {kit && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setKit(null)}
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              ← New kit
            </button>
          </div>
          <LaunchKitDisplay kit={kit} productName={defaultProductName} />
        </div>
      )}
    </div>
  );
}
