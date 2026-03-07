"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Rocket, Loader2, CalendarDays, Copy, Check, Wand2,
  ChevronDown, ChevronUp, Twitter, Linkedin,
  MessageCircle, BookOpen, Mail, FileText,
} from "lucide-react";
import { LaunchKitDisplay, LaunchKit } from "@/components/launch-kit-display";
import { ContentPlanDay } from "@/lib/types";

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

const PLAN_LOADING_STEPS = [
  "Planning your content strategy…",
  "Writing day 1–10 drafts…",
  "Writing day 11–20 drafts…",
  "Writing day 21–30 drafts…",
  "Finalizing your 30-day plan…",
];

const THEMES = [
  { key: "launch",        label: "Launch Month",      emoji: "🚀", desc: "Announcements, founder story, driving sign-ups" },
  { key: "growth",        label: "Growth Phase",       emoji: "📈", desc: "Value posts, user stories, feature highlights" },
  { key: "community",     label: "Community",          emoji: "🤝", desc: "Conversations, opinions, audience questions" },
  { key: "thoughtleader", label: "Thought Leadership", emoji: "💡", desc: "Insights, industry takes, educational content" },
];

const FORMAT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  tweet:         { label: "Tweet",    icon: Twitter,       color: "text-sky-400" },
  thread:        { label: "Thread",   icon: Twitter,       color: "text-sky-300" },
  linkedin:      { label: "LinkedIn", icon: Linkedin,      color: "text-blue-400" },
  reddit:        { label: "Reddit",   icon: MessageCircle, color: "text-orange-400" },
  indie_hackers: { label: "IH",       icon: FileText,      color: "text-emerald-400" },
  blog_draft:    { label: "Blog",     icon: BookOpen,      color: "text-purple-400" },
  email_body:    { label: "Email",    icon: Mail,          color: "text-amber-400" },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DayCard({ day, startDate }: { day: ContentPlanDay; startDate: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(day.draft);
  const [improving, setImproving] = useState(false);

  const postDate = new Date(startDate);
  postDate.setDate(postDate.getDate() + day.day - 1);
  const dateLabel = postDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const meta = FORMAT_META[day.format] ?? FORMAT_META.tweet;
  const Icon = meta.icon;

  const improve = async () => {
    setImproving(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, platform: day.format }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setDraft(data.improved);
      toast.success("Improved!");
    } catch { toast.error("Improve failed"); }
    finally { setImproving(false); }
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left"
      >
        <span className="text-xs font-mono text-zinc-600 w-8 shrink-0">D{day.day}</span>
        <span className="text-xs text-zinc-600 w-20 shrink-0">{dateLabel}</span>
        <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${meta.color}`}>
          <Icon className="h-3 w-3" />{meta.label}
        </span>
        <span className="flex-1 text-sm text-zinc-300 truncate">{day.hook}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
      </button>

      {open && (
        <div className="p-4 bg-zinc-950 space-y-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">{day.topic}</p>
            <div className="flex items-center gap-2">
              <button onClick={improve} disabled={improving}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-purple-400 transition-colors">
                {improving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Improve
              </button>
              <CopyBtn text={draft} />
            </div>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, draft.split("\n").length + 1)}
            className="bg-zinc-900 border-zinc-800 text-zinc-200 text-sm resize-none focus:border-zinc-600"
          />
        </div>
      )}
    </div>
  );
}

function KitLoadingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) => setTimeout(() => setStep(i), i * 2800));
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
            <div key={i} className={`h-1 w-5 rounded-full transition-all duration-500 ${i <= step ? "bg-white" : "bg-zinc-800"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanLoadingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = PLAN_LOADING_STEPS.map((_, i) => setTimeout(() => setStep(i), i * 4000));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="flex flex-col items-center py-12 space-y-5">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-zinc-800 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
      </div>
      <div className="text-center space-y-3">
        <p className="text-white font-medium text-sm">{PLAN_LOADING_STEPS[step]}</p>
        <div className="flex gap-1.5 justify-center">
          {PLAN_LOADING_STEPS.map((_, i) => (
            <div key={i} className={`h-1 w-6 rounded-full transition-all duration-700 ${i <= step ? "bg-white" : "bg-zinc-800"}`} />
          ))}
        </div>
        <p className="text-xs text-zinc-600">Generating 30 real post drafts — ~20 seconds</p>
      </div>
    </div>
  );
}

function ContentPlanSection() {
  const [theme, setTheme] = useState("launch");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{ id: string; days: ContentPlanDay[] } | null>(null);
  const [startDate] = useState(new Date().toISOString().slice(0, 10));

  const generate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, startDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPlan(data.plan);
      toast.success("30-day plan ready!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 bg-zinc-900/60 border-b border-zinc-800">
        <CalendarDays className="h-4 w-4 text-zinc-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">30-Day Post-Launch Plan</p>
          <p className="text-xs text-zinc-500 mt-0.5">30 ready-to-publish drafts across every platform. One click.</p>
        </div>
        {plan && (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{plan.days.length} posts</Badge>
        )}
      </div>

      <div className="p-5">
        {!plan && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    theme === t.key
                      ? "border-white/30 bg-white/5 text-white"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="font-medium text-sm mb-0.5">{t.emoji} {t.label}</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
            <Button
              onClick={generate}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-10"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Generate 30-day plan
            </Button>
          </div>
        )}

        {loading && <PlanLoadingSteps />}

        {plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                Starting {new Date(startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Click any day to expand and edit.
              </p>
              <button onClick={() => setPlan(null)} className="text-xs text-zinc-600 hover:text-white transition-colors">
                Regenerate
              </button>
            </div>
            <div className="space-y-2">
              {plan.days.map((day) => (
                <DayCard key={day.day} day={day} startDate={startDate} />
              ))}
            </div>
          </div>
        )}
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
    if (!launchDescription.trim()) { toast.error("Describe your launch first."); return; }
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
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
            />
            <p className="text-xs text-zinc-600">The more specific you are, the better the copy. ⌘↵ to generate.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-500">Anything else? <span className="text-zinc-600">(optional)</span></Label>
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

      {loading && <KitLoadingSteps />}

      {kit && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setKit(null)}
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              ← New kit
            </button>
          </div>
          <LaunchKitDisplay kit={kit} productName={defaultProductName} />
          <ContentPlanSection />
        </div>
      )}
    </div>
  );
}
