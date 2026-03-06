"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Rocket,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Twitter,
  Linkedin,
  MessageCircle,
  Mail,
  Newspaper,
  Zap,
  Globe,
  Image,
  Sparkles,
} from "lucide-react";

interface LaunchKit {
  product_hunt: { tagline: string; description: string; first_comment: string };
  hacker_news: { title: string; post: string };
  press_release: { headline: string; subheadline: string; body: string };
  email_announcement: { subject: string; preview_text: string; body: string };
  social: {
    launch_tweet: string;
    launch_thread: string[];
    linkedin_post: string;
    threads_post: string;
  };
  one_liners: {
    elevator: string;
    investor: string;
    technical: string;
    benefit: string;
    viral: string;
  };
  image_prompts: {
    og_image: string;
    product_hunt_thumbnail: string;
    twitter_header: string;
    linkedin_banner: string;
  };
}

interface Props {
  defaultProductName: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-zinc-900/80 hover:bg-zinc-900 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-zinc-500" />
          <span className="font-medium text-sm text-white">{title}</span>
          {badge && (
            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        )}
      </button>
      {open && <div className="divide-y divide-zinc-800/60">{children}</div>}
    </div>
  );
}

function Block({
  label,
  value,
  mono = false,
  fullCopy = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
  fullCopy?: boolean;
}) {
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
        {fullCopy && <CopyButton text={value} label="Copy" />}
      </div>
      <p
        className={`text-sm leading-relaxed whitespace-pre-wrap ${
          mono
            ? "font-mono text-emerald-400 bg-zinc-900/80 rounded-lg px-3 py-2 text-xs"
            : "text-zinc-300"
        }`}
      >
        {value}
      </p>
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
      {/* Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-zinc-300">
            What are you launching?
          </Label>
          <Textarea
            value={launchDescription}
            onChange={(e) => setLaunchDescription(e.target.value)}
            rows={5}
            placeholder={`Describe your launch in plain English. What is it, who is it for, and what makes it worth talking about?\n\ne.g. "Shipcast is a tool for solo founders that turns product updates into ready-to-post social content — tweets, threads, LinkedIn, and more — using AI that learns your brand voice. It's live today with a free plan and a Studio plan at $49/mo for direct posting."`}
            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-sm leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
          />
          <p className="text-xs text-zinc-600">
            Be specific — mention what makes it different, who it&apos;s for, and anything unique about the story. ⌘↵ to generate.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-zinc-500">
            Anything else? <span className="text-zinc-600">(optional)</span>
          </Label>
          <Textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={2}
            placeholder="Pricing details, launch offer, important dates, traction metrics, press mentions…"
            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none text-sm"
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading || !launchDescription.trim()}
          className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building your launch kit…
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Build launch kit
            </>
          )}
        </Button>
      </div>

      {/* Output */}
      {kit && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <h2 className="font-semibold text-white text-sm">Launch kit for {defaultProductName || "your product"}</h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Generated</Badge>
          </div>

          {/* One-liners — put first for quick wins */}
          <Section title="One-liners" icon={Zap} badge="5 pitches">
            <div className="px-5 py-4 grid gap-4">
              {(
                [
                  ["Elevator pitch", kit.one_liners.elevator],
                  ["Investor pitch", kit.one_liners.investor],
                  ["Developer pitch", kit.one_liners.technical],
                  ["User benefit", kit.one_liners.benefit],
                  ["Viral hook", kit.one_liners.viral],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
                  <div className="flex gap-3 items-start">
                    <p className="flex-1 text-sm text-white font-medium leading-relaxed">{value}</p>
                    <CopyButton text={value} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Social */}
          <Section title="Twitter / X" icon={Twitter} badge="Tweet + Thread">
            <Block label="Launch tweet" value={kit.social.launch_tweet} />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Launch thread</p>
                <CopyButton
                  text={kit.social.launch_thread.map((t, i) => `${i + 1}/ ${t}`).join("\n\n")}
                  label="Copy full thread"
                />
              </div>
              {kit.social.launch_thread.map((tweet, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-xs text-zinc-600 font-mono mt-0.5 w-5 shrink-0 tabular-nums">{i + 1}/</span>
                  <p className="flex-1 text-sm text-zinc-300 leading-relaxed">{tweet}</p>
                  <CopyButton text={tweet} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="LinkedIn" icon={Linkedin} badge="Launch post">
            <Block label="Post" value={kit.social.linkedin_post} />
          </Section>

          <Section title="Threads" icon={MessageCircle} badge="Launch post">
            <Block label="Post" value={kit.social.threads_post} />
          </Section>

          {/* Product Hunt */}
          <Section title="Product Hunt" icon={Globe} badge="Listing + Comment" defaultOpen={false}>
            <Block label="Tagline" value={kit.product_hunt.tagline} mono />
            <Block label="Description" value={kit.product_hunt.description} />
            <Block label="First comment" value={kit.product_hunt.first_comment} />
          </Section>

          {/* Hacker News */}
          <Section title="Hacker News" icon={Globe} badge="Show HN" defaultOpen={false}>
            <Block label="Title" value={kit.hacker_news.title} mono />
            <Block label="Post body" value={kit.hacker_news.post} />
          </Section>

          {/* Email */}
          <Section title="Email announcement" icon={Mail} badge="List" defaultOpen={false}>
            <Block label="Subject" value={kit.email_announcement.subject} mono />
            <Block label="Preview text" value={kit.email_announcement.preview_text} mono />
            <Block label="Body" value={kit.email_announcement.body} />
          </Section>

          {/* Press Release */}
          <Section title="Press release" icon={Newspaper} badge="Media" defaultOpen={false}>
            <Block label="Headline" value={kit.press_release.headline} />
            <Block label="Subheadline" value={kit.press_release.subheadline} />
            <Block label="Full release" value={kit.press_release.body} />
          </Section>

          {/* Image Generation — Coming Soon */}
          <Section title="Image generation" icon={Image} badge="Coming soon" defaultOpen={false}>
            <div className="px-5 py-5 space-y-4">
              <p className="text-xs text-zinc-500">
                AI-generated launch visuals are coming. When ready, these prompts will produce ready-to-use images for each platform.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "OG / Social share", size: "1200 × 628", prompt: kit.image_prompts.og_image },
                  { label: "Product Hunt thumbnail", size: "480 × 480", prompt: kit.image_prompts.product_hunt_thumbnail },
                  { label: "Twitter header", size: "1500 × 500", prompt: kit.image_prompts.twitter_header },
                  { label: "LinkedIn banner", size: "1584 × 396", prompt: kit.image_prompts.linkedin_banner },
                ].map(({ label, size, prompt }) => (
                  <div
                    key={label}
                    className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-zinc-300">{label}</p>
                        <p className="text-[10px] text-zinc-600 font-mono">{size}</p>
                      </div>
                      <span className="text-[9px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded-full shrink-0">
                        Soon
                      </span>
                    </div>
                    <div className="aspect-video rounded bg-zinc-800/60 flex items-center justify-center">
                      <Image className="h-5 w-5 text-zinc-700" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-zinc-600 leading-relaxed line-clamp-2 flex-1 mr-2">{prompt}</p>
                      <CopyButton text={prompt} label="Prompt" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
