"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandVoice } from "@/lib/types";

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

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [brandVoice, setBrandVoice] = useState<BrandVoice>("casual");
  const [examplePosts, setExamplePosts] = useState(["", ""]);

  const updateExample = (index: number, value: string) => {
    setExamplePosts((prev) => prev.map((p, i) => (i === index ? value : p)));
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

        {/* Step 1: Product info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Tell us about your product</h1>
              <p className="text-zinc-500 text-sm">
                This helps Shipcast write content that sounds specific, not generic.
              </p>
            </div>

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
              <p className="text-zinc-500 text-sm">
                Every post will be generated in this tone.
              </p>
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
                {loading ? "Saving..." : "Finish setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
