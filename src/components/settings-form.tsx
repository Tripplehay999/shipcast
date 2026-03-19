"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandVoice } from "@/lib/types";
import { Package, Mic2, FileText, Plus, Trash2, Save, Check, Link2 } from "lucide-react";

const voiceOptions: { value: BrandVoice; label: string; desc: string; emoji: string }[] = [
  { value: "casual",       label: "Casual Founder",    emoji: "👋", desc: "Authentic, personal, conversational. Like texting a friend." },
  { value: "professional", label: "Professional SaaS", emoji: "💼", desc: "Polished, clear, confident. Builds trust with enterprise." },
  { value: "developer",    label: "Developer Voice",   emoji: "⌨️", desc: "Technical, honest, dry humor. Speaks directly to builders." },
];

interface Profile {
  product_name: string;
  product_description: string;
  brand_voice: BrandVoice;
  example_posts: string[];
  product_link?: string | null;
}

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [productName, setProductName] = useState(profile?.product_name ?? "");
  const [productDescription, setProductDescription] = useState(profile?.product_description ?? "");
  const [productLink, setProductLink] = useState(profile?.product_link ?? "");
  const [brandVoice, setBrandVoice] = useState<BrandVoice>(profile?.brand_voice ?? "casual");
  const [examplePosts, setExamplePosts] = useState<string[]>(
    profile?.example_posts?.length ? profile.example_posts : [""]
  );

  const updateExample = (i: number, value: string) =>
    setExamplePosts((prev) => prev.map((p, j) => (j === i ? value : p)));

  const addExample = () => setExamplePosts((prev) => [...prev, ""]);
  const removeExample = (i: number) => setExamplePosts((prev) => prev.filter((_, j) => j !== i));

  const handleSave = async () => {
    if (!productName.trim()) { toast.error("Product name is required."); return; }
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
          productLink: productLink.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Product */}
      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
          <Package className="h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <p className="text-xs text-zinc-500">Basic info about what you&apos;re building.</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Product name</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Shipcast"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">What does it do?</Label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              placeholder="Describe your product in 1-3 sentences. What problem does it solve? Who is it for?"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-700">{productDescription.length} chars — be specific, this feeds the AI.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> Product URL
              <span className="text-zinc-700 font-normal normal-case tracking-normal">(for UTM tracking)</span>
            </Label>
            <Input
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://yourproduct.com"
              type="url"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 h-10"
            />
            <p className="text-xs text-zinc-700">Shipcast auto-appends UTM params to this URL in every generated post.</p>
          </div>
        </div>
      </div>

      {/* Voice */}
      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
          <Mic2 className="h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-white">Brand Voice</p>
            <p className="text-xs text-zinc-500">How you sound. Affects all generated content.</p>
          </div>
        </div>
        <div className="p-5 space-y-2">
          {voiceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBrandVoice(opt.value)}
              className={`w-full text-left rounded-xl border p-4 transition-all flex items-start gap-4 ${
                brandVoice === opt.value
                  ? "border-white/40 bg-white/5"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-white">{opt.label}</p>
                  {brandVoice === opt.value && (
                    <span className="text-[10px] bg-white text-black px-1.5 py-0.5 rounded-full font-semibold">Active</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Example posts */}
      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-sm font-semibold text-white">Example Posts</p>
              <p className="text-xs text-zinc-500">Paste your best posts so the AI matches your exact style.</p>
            </div>
          </div>
          <button
            onClick={addExample}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="p-5 space-y-4">
          {examplePosts.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">
              No examples yet. Add posts in your voice to improve generation quality.
            </p>
          )}
          {examplePosts.map((post, i) => (
            <div key={i} className="space-y-1.5 group">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-500">Example {i + 1}</Label>
                <button
                  onClick={() => removeExample(i)}
                  className="flex items-center gap-1 text-[11px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
              <Textarea
                value={post}
                onChange={(e) => updateExample(i, e.target.value)}
                rows={3}
                className="bg-zinc-900 border-zinc-800 text-white resize-none focus:border-zinc-600 placeholder:text-zinc-700 text-sm"
                placeholder="Paste a tweet, LinkedIn post, or any content in your voice…"
              />
              {post.length > 0 && (
                <p className="text-[11px] text-zinc-700 text-right">{post.length} chars</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button
        className={`w-full h-11 font-semibold transition-all ${
          saved ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-white text-black hover:bg-zinc-200"
        }`}
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving…" : saved ? (
          <><Check className="h-4 w-4 mr-2" />Saved</>
        ) : (
          <><Save className="h-4 w-4 mr-2" />Save settings</>
        )}
      </Button>
    </div>
  );
}
