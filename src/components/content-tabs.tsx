"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GenerateResponse } from "@/lib/types";
import { Copy, Check, Send, CalendarClock, Loader2, Wand2, RefreshCw, FlaskConical, X } from "lucide-react";
import { toast } from "sonner";

interface ContentTabsProps {
  content: GenerateResponse;
  plan?: "free" | "pro" | "studio";
  updateId?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent h-7 px-2" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function PostNowButton({ platform, content }: { platform: "twitter" | "linkedin" | "threads"; content: string }) {
  const [loading, setLoading] = useState(false);
  const handlePost = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/post/now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Post failed");
      const label = platform === "twitter" ? "Twitter / X" : platform === "linkedin" ? "LinkedIn" : "Threads";
      toast.success(`Posted to ${label}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent h-7 px-2 text-xs gap-1" onClick={handlePost} disabled={loading}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      Post now
    </Button>
  );
}

function ScheduleButton({ platform, content, updateId }: { platform: "twitter" | "linkedin" | "threads"; content: string; updateId?: string }) {
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const handleSchedule = async () => {
    if (!scheduledAt) { toast.error("Pick a date and time"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, content, scheduledAt: new Date(scheduledAt).toISOString(), updateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      toast.success("Scheduled! View in Post queue.");
      setShowPicker(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setLoading(false);
    }
  };

  if (showPicker) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="h-7 text-xs bg-zinc-900 border border-zinc-700 rounded px-2 text-white"
        />
        <Button size="sm" className="h-7 px-2 text-xs bg-white text-black hover:bg-zinc-200" onClick={handleSchedule} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-500" onClick={() => setShowPicker(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent h-7 px-2 text-xs gap-1" onClick={() => setShowPicker(true)}>
      <CalendarClock className="h-3 w-3" />
      Schedule
    </Button>
  );
}

function ImproveButton({ platform, value, onImproved }: { platform: string; value: string; onImproved: (v: string) => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value, platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Improve failed");
      onImproved(data.improved);
      toast.success("Improved!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Improve failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant="outline"
      className="border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500/40 bg-transparent h-7 px-2 text-xs gap-1"
      onClick={handle} disabled={loading} title="Improve with AI">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
      Improve
    </Button>
  );
}

interface ABVariants { variantA: string; variantB: string; hookA: string; hookB: string; }

function ABTestTrigger({ platform, value, loading, onGenerate }: {
  platform: string; value: string; loading: boolean; onGenerate: (v: string, p: string) => void;
}) {
  const abSupported = ["tweet", "linkedin", "thread", "reddit", "indie_hackers"].includes(platform);
  if (!abSupported) return null;
  return (
    <Button size="sm" variant="outline"
      className="border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500/40 bg-transparent h-7 px-2 text-xs gap-1"
      onClick={() => onGenerate(value, platform)} disabled={loading} title="Generate A/B variants">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
      A/B
    </Button>
  );
}

function ABTestPanel({ variants, onSelect, onClose }: {
  variants: ABVariants; onSelect: (v: string, label: string) => void; onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-purple-400 font-medium">A/B Variants — pick one to use</span>
        <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>
      {([["A", variants.variantA, variants.hookA], ["B", variants.variantB, variants.hookB]] as [string, string, string][]).map(([label, text, hook]) => (
        <div key={label} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500">Variant {label} · {hook}</span>
            <Button size="sm" className="h-6 px-2 text-[10px] bg-white text-black hover:bg-zinc-200"
              onClick={() => onSelect(text, label)}>
              Use this
            </Button>
          </div>
          <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  );
}

const FORMAT_LABELS: Record<string, string> = {
  tweet: "Tweet", thread: "Thread", linkedin: "LinkedIn", reddit: "Reddit",
  indie_hackers: "Indie Hackers", blog_draft: "Detailed Update",
  email_body: "Email", changelog_entry: "Changelog",
};

const REPURPOSE_TARGETS: Record<string, string[]> = {
  tweet:          ["thread", "linkedin", "reddit"],
  thread:         ["linkedin", "blog_draft", "reddit"],
  linkedin:       ["tweet", "thread", "email_body"],
  reddit:         ["tweet", "linkedin"],
  indie_hackers:  ["tweet", "linkedin", "email_body"],
  blog_draft:     ["thread", "linkedin", "email_body", "reddit"],
  email_body:     ["linkedin", "tweet", "indie_hackers"],
  changelog_entry:["tweet", "linkedin", "email_body"],
};

function RepurposeButton({ sourceKey, sourceValue, onResult }: {
  sourceKey: string; sourceValue: string;
  onResult: (targetKey: string, result: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const targets = REPURPOSE_TARGETS[sourceKey] ?? [];
  if (!targets.length) return null;

  const repurpose = async (targetFormat: string) => {
    setLoading(targetFormat);
    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sourceValue, sourceFormat: sourceKey, targetFormat }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Repurpose failed");
      onResult(targetFormat, data.result);
      toast.success(`Repurposed → ${FORMAT_LABELS[targetFormat]}`);
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Repurpose failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <Button size="sm" variant="outline"
        className="border-zinc-700 text-zinc-400 hover:text-sky-400 hover:border-sky-500/40 bg-transparent h-7 px-2 text-xs gap-1"
        onClick={() => setOpen(!open)}>
        <RefreshCw className="h-3 w-3" /> Repurpose
      </Button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-zinc-900 border border-zinc-700 rounded-lg p-1 shadow-2xl min-w-[150px]">
          {targets.map((fmt) => (
            <button key={fmt} onClick={() => repurpose(fmt)} disabled={!!loading}
              className="w-full text-left text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 py-1.5 rounded flex items-center justify-between gap-2">
              → {FORMAT_LABELS[fmt]}
              {loading === fmt && <Loader2 className="h-3 w-3 animate-spin" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "tweet",           label: "Tweet",     platform: "twitter" as const,   rows: 4  },
  { key: "thread",          label: "Thread",    platform: null,                  rows: 10 },
  { key: "linkedin",        label: "LinkedIn",  platform: "linkedin" as const,  rows: 8  },
  { key: "reddit",          label: "Reddit",    platform: null,                  rows: 6  },
  { key: "indie_hackers",   label: "IH",        platform: null,                  rows: 5  },
  { key: "blog_draft",      label: "Blog",      platform: null,                  rows: 16 },
  { key: "email_body",      label: "Email",     platform: null,                  rows: 7  },
  { key: "changelog_entry", label: "Changelog", platform: null,                  rows: 5  },
] as const;

type TabKey = typeof TABS[number]["key"];

export function ContentTabs({ content, plan = "free", updateId }: ContentTabsProps) {
  const [values, setValues] = useState<Record<TabKey, string>>({
    tweet:           content.tweet ?? "",
    thread:          Array.isArray(content.thread) ? content.thread.join("\n\n---\n\n") : "",
    linkedin:        content.linkedin ?? "",
    reddit:          content.reddit ?? "",
    indie_hackers:   content.indie_hackers ?? "",
    blog_draft:      content.blog_draft ?? "",
    email_body:      content.email_subject
                       ? `Subject: ${content.email_subject}\n\n${content.email_body ?? ""}`
                       : (content.email_body ?? ""),
    changelog_entry: content.changelog_entry ?? "",
  });
  const [abVariants, setAbVariants] = useState<Partial<Record<TabKey, ABVariants>>>({});
  const [abLoading, setAbLoading] = useState<Partial<Record<TabKey, boolean>>>({});

  const update = (key: TabKey) => (val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const generateAB = async (value: string, platform: string) => {
    const key = platform as TabKey;
    setAbLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value, platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAbVariants((prev) => ({ ...prev, [key]: data }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "A/B test failed");
    } finally {
      setAbLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isStudio = plan === "studio";

  const fullLabel: Record<TabKey, string> = {
    tweet: "Tweet", thread: "Thread", linkedin: "LinkedIn", reddit: "Reddit",
    indie_hackers: "Indie Hackers", blog_draft: "Blog article draft",
    email_body: "Email (subject + body)", changelog_entry: "Changelog entry",
  };

  return (
    <Tabs defaultValue="tweet">
      <TabsList className="bg-zinc-900 border border-zinc-800 h-9 flex-wrap gap-px">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key}
            className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-500">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-600 uppercase tracking-widest">{fullLabel[t.key]}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <RepurposeButton
                  sourceKey={t.key}
                  sourceValue={values[t.key]}
                  onResult={(targetKey, result) => update(targetKey as TabKey)(result)}
                />
                <ImproveButton platform={t.key} value={values[t.key]} onImproved={update(t.key)} />
                <ABTestTrigger platform={t.key} value={values[t.key]} loading={!!abLoading[t.key]} onGenerate={generateAB} />
                <CopyButton text={values[t.key]} />
                {isStudio && t.platform && (
                  <>
                    <PostNowButton platform={t.platform} content={values[t.key]} />
                    <ScheduleButton platform={t.platform} content={values[t.key]} updateId={updateId} />
                  </>
                )}
              </div>
            </div>

            <Textarea
              value={values[t.key]}
              onChange={(e) => update(t.key)(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm resize-none focus:border-zinc-600"
              rows={t.rows}
            />

            {t.key === "tweet" && (
              <p className={`text-xs text-right ${values.tweet.length > 280 ? "text-red-400" : "text-zinc-600"}`}>
                {values.tweet.length} / 280
              </p>
            )}
            {t.key === "blog_draft" && (
              <p className="text-xs text-zinc-700">Markdown — paste into Hashnode, Ghost, or your CMS.</p>
            )}
            {abVariants[t.key] && (
              <ABTestPanel
                variants={abVariants[t.key]!}
                onSelect={(v, label) => { update(t.key)(v); setAbVariants((prev) => ({ ...prev, [t.key]: undefined })); toast.success(`Variant ${label} applied`); }}
                onClose={() => setAbVariants((prev) => ({ ...prev, [t.key]: undefined }))}
              />
            )}
            {!isStudio && t.platform && (
              <p className="text-xs text-zinc-700">
                Direct posting on <a href="/pricing" className="text-zinc-500 hover:text-white underline">Studio plan</a>.
              </p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
