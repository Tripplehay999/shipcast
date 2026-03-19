"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandVoice } from "@/lib/types";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

const voiceOptions: { value: BrandVoice; label: string; desc: string }[] = [
  {
    value: "casual",
    label: "Casual Founder",
    desc: "Authentic, personal, conversational. Sounds like a real person.",
  },
  {
    value: "professional",
    label: "Professional SaaS",
    desc: "Polished, clear, confident. Great for B2B audiences.",
  },
  {
    value: "developer",
    label: "Developer Voice",
    desc: "Technical, honest, dry humor. Fellow-engineer energy.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState<BrandVoice>("casual");
  const [examplePosts, setExamplePosts] = useState(["", ""]);

  const updateExample = (index: number, value: string) => {
    setExamplePosts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const handleAnalyze = async () => {
    if (!productUrl.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      if (json.productName) setProductName(json.productName);
      if (json.productDescription) setProductDescription(json.productDescription);
      if (json.targetAudience) setTargetAudience(json.targetAudience);
      setAnalyzed(true);
      toast.success("Product analyzed! Review and edit below.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not analyze URL";
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          brandVoice,
          examplePosts: examplePosts.filter((p) => p.trim()),
          productLink: productUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save profile");

      toast.success("Profile saved! Let's start shipping.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-white" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Analyze your product */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Let&apos;s build your marketing system</h1>
              <p className="text-zinc-500 text-sm">
                Start with your product URL and we&apos;ll auto-fill everything.
              </p>
            </div>

            {/* URL input */}
            <div className="space-y-2">
              <Label htmlFor="url">Product URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://yourproduct.com"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!productUrl.trim() || analyzing}
                  className="bg-white text-black hover:bg-zinc-200 shrink-0"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              {analyzing && (
                <p className="text-xs text-zinc-600 animate-pulse">
                  Analyzing your product...
                </p>
              )}
            </div>

            {/* Analyzed card */}
            {analyzed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-300">
                  Product detected. Fields pre-filled below — edit anything that&apos;s off.
                </div>
              </div>
            )}

            {/* Product name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                placeholder="e.g. InvoiceHive"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Product description */}
            <div className="space-y-2">
              <Label htmlFor="desc">What does it do? (1-2 sentences)</Label>
              <Textarea
                id="desc"
                placeholder="e.g. InvoiceHive is an invoicing tool for freelancers. It automates payment reminders and tracks unpaid invoices."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Target audience */}
            <div className="space-y-2">
              <Label htmlFor="audience">
                Target audience{" "}
                <span className="text-zinc-600 font-normal">(optional)</span>
              </Label>
              <Input
                id="audience"
                placeholder="e.g. freelancers, startup founders, developers"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <Button
              className="w-full bg-white text-black hover:bg-zinc-200"
              disabled={!productName.trim() || !productDescription.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Brand voice */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Pick your brand voice</h1>
              <p className="text-zinc-500 text-sm">Every post will be generated in this tone.</p>
            </div>

            <div className="space-y-3">
              {voiceOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBrandVoice(opt.value)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    brandVoice === opt.value
                      ? "border-white bg-zinc-900"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <p className="font-medium text-sm text-white">{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-800 text-zinc-400 hover:text-white bg-transparent"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-zinc-200"
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Example posts */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Add example posts (optional)</h1>
              <p className="text-zinc-500 text-sm">
                Paste 1-2 of your best posts. Shipcast will match your exact style.
              </p>
            </div>

            {examplePosts.map((post, i) => (
              <div key={i} className="space-y-2">
                <Label>Example {i + 1}</Label>
                <Textarea
                  placeholder={
                    i === 0
                      ? "Paste a tweet, LinkedIn post, or anything you've written..."
                      : "Another example (optional)"
                  }
                  value={post}
                  onChange={(e) => updateExample(i, e.target.value)}
                  rows={4}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
                />
              </div>
            ))}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-800 text-zinc-400 hover:text-white bg-transparent"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-zinc-200"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Finish setup"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
