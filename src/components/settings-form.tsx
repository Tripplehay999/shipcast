"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BrandVoice } from "@/lib/types";

const voiceOptions: { value: BrandVoice; label: string; desc: string }[] = [
  { value: "casual", label: "Casual Founder", desc: "Authentic, personal, conversational." },
  { value: "professional", label: "Professional SaaS", desc: "Polished, clear, confident." },
  { value: "developer", label: "Developer Voice", desc: "Technical, honest, dry humor." },
];

interface Profile {
  product_name: string;
  product_description: string;
  brand_voice: BrandVoice;
  example_posts: string[];
}

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState(profile?.product_name ?? "");
  const [productDescription, setProductDescription] = useState(profile?.product_description ?? "");
  const [brandVoice, setBrandVoice] = useState<BrandVoice>(profile?.brand_voice ?? "casual");
  const [examplePosts, setExamplePosts] = useState(
    profile?.example_posts?.length ? profile.example_posts : ["", ""]
  );

  const updateExample = (index: number, value: string) =>
    setExamplePosts((prev) => prev.map((p, i) => (i === index ? value : p)));

  const handleSave = async () => {
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
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Product */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Product</h2>
        <div className="space-y-2">
          <Label>Product name</Label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label>What does it do?</Label>
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={3}
            className="bg-zinc-900 border-zinc-800 text-white resize-none"
          />
        </div>
      </section>

      <Separator className="bg-zinc-800" />

      {/* Voice */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Brand Voice</h2>
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
      </section>

      <Separator className="bg-zinc-800" />

      {/* Example posts */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Example Posts</h2>
          <p className="text-xs text-zinc-600 mt-1">Paste examples of your best posts to improve voice matching.</p>
        </div>
        {examplePosts.map((post, i) => (
          <div key={i} className="space-y-2">
            <Label>Example {i + 1}</Label>
            <Textarea
              value={post}
              onChange={(e) => updateExample(i, e.target.value)}
              rows={4}
              className="bg-zinc-900 border-zinc-800 text-white resize-none"
              placeholder="Paste a tweet, LinkedIn post, or any content in your voice..."
            />
          </div>
        ))}
      </section>

      <Button
        className="w-full bg-white text-black hover:bg-zinc-200"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}
