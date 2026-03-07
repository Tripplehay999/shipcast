"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Copy, Check, ChevronDown, ChevronUp,
  Twitter, Linkedin, MessageCircle, Mail, Newspaper,
  Zap, Globe, Image, Sparkles, Share2, ExternalLink,
} from "lucide-react";

export interface LaunchKit {
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ShareButton({ platform, text, subject }: { platform: "twitter" | "linkedin" | "email"; text?: string; subject?: string }) {
  const open = () => {
    let url = "";
    if (platform === "twitter" && text) {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`;
    } else if (platform === "linkedin") {
      url = "https://www.linkedin.com/feed/";
    } else if (platform === "email" && text) {
      url = `mailto:?subject=${encodeURIComponent(subject ?? "")}&body=${encodeURIComponent(text)}`;
    }
    if (url) window.open(url, "_blank");
  };

  const labels: Record<string, string> = {
    twitter: "Share on X",
    linkedin: "Open LinkedIn",
    email: "Open in email",
  };

  return (
    <button
      onClick={open}
      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-sky-400 transition-colors shrink-0"
    >
      <Share2 className="h-3 w-3" />
      {labels[platform]}
    </button>
  );
}

function Section({
  title, icon: Icon, badge, defaultOpen = true, children,
}: {
  title: string; icon: React.ElementType; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
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
        {open ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
      </button>
      {open && <div className="divide-y divide-zinc-800/60">{children}</div>}
    </div>
  );
}

function Block({ label, value, mono = false, actions }: {
  label: string; value: string; mono?: boolean; actions?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          <CopyButton text={value} />
        </div>
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${mono ? "font-mono text-emerald-400 bg-zinc-900/80 rounded-lg px-3 py-2 text-xs" : "text-zinc-300"}`}>
        {value}
      </p>
    </div>
  );
}

export function LaunchKitDisplay({ kit, productName }: { kit: LaunchKit; productName?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1">
        <Sparkles className="h-4 w-4 text-yellow-400" />
        <h2 className="font-semibold text-white text-sm">
          {productName ? `Launch kit · ${productName}` : "Launch kit"}
        </h2>
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Ready</Badge>
      </div>

      {/* One-liners */}
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

      {/* Twitter */}
      <Section title="Twitter / X" icon={Twitter} badge="Tweet + Thread">
        <Block
          label="Launch tweet"
          value={kit.social.launch_tweet}
          actions={<ShareButton platform="twitter" text={kit.social.launch_tweet} />}
        />
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Launch thread</p>
            <div className="flex items-center gap-3">
              <ShareButton platform="twitter" text={kit.social.launch_thread[0]} />
              <CopyButton text={kit.social.launch_thread.map((t, i) => `${i + 1}/ ${t}`).join("\n\n")} />
            </div>
          </div>
          {kit.social.launch_thread.map((tweet, i) => (
            <div key={i} className="flex gap-3 items-start group">
              <span className="text-xs text-zinc-600 font-mono mt-0.5 w-5 shrink-0 tabular-nums">{i + 1}/</span>
              <p className="flex-1 text-sm text-zinc-300 leading-relaxed">{tweet}</p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={tweet} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* LinkedIn */}
      <Section title="LinkedIn" icon={Linkedin} badge="Launch post">
        <Block label="Post" value={kit.social.linkedin_post} actions={<ShareButton platform="linkedin" />} />
      </Section>

      {/* Threads */}
      <Section title="Threads" icon={MessageCircle} badge="Launch post">
        <Block label="Post" value={kit.social.threads_post} />
      </Section>

      {/* Product Hunt */}
      <Section title="Product Hunt" icon={Globe} badge="Listing + Comment" defaultOpen={false}>
        <Block
          label="Tagline" value={kit.product_hunt.tagline} mono
          actions={
            <a href="https://www.producthunt.com/posts/new" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-orange-400 transition-colors">
              <ExternalLink className="h-3 w-3" /> Submit to PH
            </a>
          }
        />
        <Block label="Description" value={kit.product_hunt.description} />
        <Block label="First comment" value={kit.product_hunt.first_comment} />
      </Section>

      {/* Hacker News */}
      <Section title="Hacker News" icon={Globe} badge="Show HN" defaultOpen={false}>
        <Block
          label="Title" value={kit.hacker_news.title} mono
          actions={
            <a
              href={`https://news.ycombinator.com/submitlink?t=${encodeURIComponent(kit.hacker_news.title)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-orange-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Submit to HN
            </a>
          }
        />
        <Block label="Post body" value={kit.hacker_news.post} />
      </Section>

      {/* Email */}
      <Section title="Email announcement" icon={Mail} badge="List" defaultOpen={false}>
        <Block
          label="Subject" value={kit.email_announcement.subject} mono
          actions={
            <ShareButton platform="email" subject={kit.email_announcement.subject} text={kit.email_announcement.body} />
          }
        />
        <Block label="Preview text" value={kit.email_announcement.preview_text} mono />
        <Block label="Body" value={kit.email_announcement.body} />
      </Section>

      {/* Press Release */}
      <Section title="Press release" icon={Newspaper} badge="Media" defaultOpen={false}>
        <Block label="Headline" value={kit.press_release.headline} />
        <Block label="Subheadline" value={kit.press_release.subheadline} />
        <Block label="Full release" value={kit.press_release.body} />
      </Section>

      {/* Image prompts */}
      <Section title="Image generation" icon={Image} badge="Coming soon" defaultOpen={true}>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300">Coming soon — AI image generation</p>
              <p className="text-xs text-zinc-500 mt-0.5">We&apos;ll generate these automatically. For now, copy the prompt into Midjourney or DALL-E.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "OG / Social share",      size: "1200×628",  prompt: kit.image_prompts.og_image },
              { label: "Product Hunt thumbnail",  size: "480×480",   prompt: kit.image_prompts.product_hunt_thumbnail },
              { label: "Twitter header",          size: "1500×500",  prompt: kit.image_prompts.twitter_header },
              { label: "LinkedIn banner",         size: "1584×396",  prompt: kit.image_prompts.linkedin_banner },
            ].map(({ label, size, prompt }) => (
              <div key={label} className="border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden">
                {/* Preview placeholder */}
                <div className="aspect-video bg-gradient-to-br from-zinc-800/60 to-zinc-900 flex flex-col items-center justify-center gap-1.5 relative">
                  <Image className="h-5 w-5 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600 font-mono">{size}</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-900/80 border border-zinc-700 px-2 py-0.5 rounded-full tracking-widest uppercase">Coming Soon</span>
                  </div>
                </div>
                {/* Label + prompt + copy */}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-zinc-300">{label}</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-3">{prompt}</p>
                  <CopyButton text={prompt} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
