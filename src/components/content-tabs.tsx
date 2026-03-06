"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GenerateResponse } from "@/lib/types";
import { Copy, Check, Send, CalendarClock, Loader2, Wand2 } from "lucide-react";
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

function PostNowButton({ platform, content }: { platform: "twitter" | "linkedin"; content: string }) {
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
      toast.success(`Posted to ${platform === "twitter" ? "Twitter / X" : "LinkedIn"}!`);
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

function ScheduleButton({ platform, content, updateId }: { platform: "twitter" | "linkedin"; content: string; updateId?: string }) {
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
  const handleImprove = async () => {
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
    <Button
      size="sm"
      variant="outline"
      className="border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500/40 bg-transparent h-7 px-2 text-xs gap-1"
      onClick={handleImprove}
      disabled={loading}
      title="Improve with AI"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
      Improve
    </Button>
  );
}

export function ContentTabs({ content, plan = "free", updateId }: ContentTabsProps) {
  const [values, setValues] = useState({
    tweet: content.tweet,
    thread: content.thread.join("\n\n---\n\n"),
    linkedin: content.linkedin,
    reddit: content.reddit,
    indie_hackers: content.indie_hackers,
  });

  const update = (key: keyof typeof values) => (val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const isStudio = plan === "studio";

  const tabs = [
    { key: "tweet" as const, label: "Tweet", platform: "twitter" as const },
    { key: "thread" as const, label: "Thread", platform: null },
    { key: "linkedin" as const, label: "LinkedIn", platform: "linkedin" as const },
    { key: "reddit" as const, label: "Reddit", platform: null },
    { key: "indie_hackers" as const, label: "IH", platform: null },
  ];

  return (
    <Tabs defaultValue="tweet">
      <TabsList className="bg-zinc-900 border border-zinc-800 h-9">
        {tabs.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-500">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-600 uppercase tracking-widest">
                {t.label === "IH" ? "Indie Hackers" : t.label}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <ImproveButton
                  platform={t.key}
                  value={values[t.key]}
                  onImproved={(v) => update(t.key)(v)}
                />
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
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm resize-none min-h-[120px] focus:border-zinc-600"
            />
            {t.key === "tweet" && (
              <p className={`text-xs text-right ${values.tweet.length > 280 ? "text-red-400" : "text-zinc-600"}`}>
                {values.tweet.length} / 280
              </p>
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
