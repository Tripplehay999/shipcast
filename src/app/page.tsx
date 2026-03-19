import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Zap,
  Globe,
  Target,
  Megaphone,
  GitCommit,
  CalendarDays,
  Rocket,
  Radio,
  BarChart2,
  Terminal,
  Clock,
  Layers,
} from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { UrlAnalyzeForm } from "@/components/url-analyze-form";

const platforms = ["Twitter / X", "LinkedIn", "Reddit", "Indie Hackers", "Dev.to", "Product Hunt"];

const pipelineSteps = [
  {
    icon: <Globe className="h-4 w-4" />,
    title: "Analyze Product",
    desc: "Reads your URL, extracts features and positioning",
  },
  {
    icon: <Target className="h-4 w-4" />,
    title: "Build Foundation",
    desc: "Audience, messaging, and brand voice",
  },
  {
    icon: <Megaphone className="h-4 w-4" />,
    title: "Generate Content",
    desc: "Platform-native posts for every channel",
  },
  {
    icon: <Rocket className="h-4 w-4" />,
    title: "Launch Campaigns",
    desc: "Full launch packages, not just posts",
  },
  {
    icon: <Radio className="h-4 w-4" />,
    title: "Ship & Distribute",
    desc: "Automate from commit to published post",
  },
];

const marketingCards = [
  {
    icon: <Target className="h-5 w-5 text-sky-400" />,
    title: "Marketing Foundation",
    desc: "Positioning, audience definition, and core messaging built from your product.",
  },
  {
    icon: <CalendarDays className="h-5 w-5 text-emerald-400" />,
    title: "30-Day Content Calendar",
    desc: "A full month of platform-ready posts, generated automatically.",
  },
  {
    icon: <Rocket className="h-5 w-5 text-amber-400" />,
    title: "Launch Campaigns",
    desc: "Coordinated multi-platform launch packages for every milestone.",
  },
  {
    icon: <GitCommit className="h-5 w-5 text-purple-400" />,
    title: "GitHub Automation",
    desc: "Every commit becomes content. Ship code, get posts.",
  },
  {
    icon: <Clock className="h-5 w-5 text-rose-400" />,
    title: "Post Queue",
    desc: "Auto-schedule and distribute across all connected platforms.",
  },
  {
    icon: <BarChart2 className="h-5 w-5 text-orange-400" />,
    title: "Growth Radar",
    desc: "Track trends, mentions, and opportunities in your space.",
  },
];

const voices = [
  {
    name: "casual",
    label: "Casual Founder",
    color: "text-emerald-400",
    example: `"Just shipped dark mode. Took way longer than it should have but here we are. Worth it."`,
  },
  {
    name: "professional",
    label: "Professional SaaS",
    color: "text-blue-400",
    example: `"We released dark mode support across all dashboard views. Available to all users today."`,
  },
  {
    name: "developer",
    label: "Developer",
    color: "text-purple-400",
    example: `"Shipped dark mode. CSS variables + prefers-color-scheme. Took 3 hours. Regret nothing."`,
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-white" />
          <span className="text-xl font-bold tracking-tight">Shipcast</span>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-zinc-200">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-white text-black hover:bg-zinc-200">Get started free</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <Badge className="mb-6 bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-900 font-mono text-xs">
          v1.0 — built for founders who ship
        </Badge>
        <h1 className="text-5xl sm:text-7xl font-bold leading-tight tracking-tight mb-6">
          Your product deserves
          <br />
          <span className="text-zinc-600">a marketing team.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Enter your product URL. Shipcast analyzes your product, builds your positioning, and
          generates campaigns across every platform — automatically.
        </p>

        <UrlAnalyzeForm />

        <p className="text-xs text-zinc-700 mt-4">
          or{" "}
          <Link href="/sign-up" className="text-zinc-600 hover:text-zinc-400 underline underline-offset-2">
            connect GitHub to automate everything
          </Link>
        </p>
      </main>

      {/* Pipeline visualization */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-10 text-center font-mono">
          how it works
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
          {pipelineSteps.map((step, i) => (
            <div key={step.title} className="flex sm:flex-col items-center sm:items-center flex-1 gap-3 sm:gap-0">
              <div className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  {step.icon}
                </div>
                <div className="sm:text-center mt-0 sm:mt-3">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 max-w-[120px] sm:mx-auto leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
              {i < pipelineSteps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-zinc-800 shrink-0 hidden sm:block sm:absolute sm:relative" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Platform pills */}
      <section className="max-w-3xl mx-auto px-6 py-10 text-center">
        <p className="text-xs text-zinc-700 uppercase tracking-widest mb-5 font-mono">
          content generated for
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {platforms.map((p) => (
            <span
              key={p}
              className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-full font-mono"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* What Shipcast builds for you */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-mono">
            the full system
          </p>
          <h2 className="text-2xl font-bold">What Shipcast builds for you</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
            Not just a post generator. A complete marketing system that runs alongside your product.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketingCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="mb-3">{card.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1">{card.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 grid sm:grid-cols-2 gap-10">
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4 font-mono">
              other tools ask
            </p>
            <p className="text-2xl font-bold text-zinc-600 mb-3">
              &ldquo;What do you want to post today?&rdquo;
            </p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              And you stare at a blank box. You have a product to build. You don&apos;t have time to
              be a content creator.
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4 font-mono">
              shipcast asks
            </p>
            <p className="text-2xl font-bold text-white mb-3">
              &ldquo;What did you build today?&rdquo;
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              That&apos;s a question you can answer. Every feature, every fix, every milestone
              becomes a full marketing campaign — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Brand voice */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-mono">
            brand voice
          </p>
          <h2 className="text-2xl font-bold">Every post sounds like you</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm mx-auto">
            Pick a voice. Add example posts. Shipcast matches your style exactly.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {voices.map((v) => (
            <div key={v.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-3.5 w-3.5 text-zinc-600" />
                <span className={`text-xs font-mono font-semibold ${v.color}`}>{v.name}</span>
              </div>
              <p className="text-xs text-zinc-600 mb-4 uppercase tracking-widest">{v.label}</p>
              <p className="text-sm text-zinc-300 leading-relaxed italic">{v.example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: <GitCommit className="h-4 w-4" />,
            title: "One input",
            desc: "Write once, get 5 platform-optimized posts back instantly.",
          },
          {
            icon: <Layers className="h-4 w-4" />,
            title: "Voice matching",
            desc: "Add example posts. The AI learns your exact writing style.",
          },
          {
            icon: <BarChart2 className="h-4 w-4" />,
            title: "Inline editing",
            desc: "Every output is editable. Tweak before you copy.",
          },
          {
            icon: <Globe className="h-4 w-4" />,
            title: "Platform-native",
            desc: "Reddit posts that sound like Reddit. Threads that read like threads.",
          },
          {
            icon: <Clock className="h-4 w-4" />,
            title: "History log",
            desc: "Every update and its generated content saved forever.",
          },
          {
            icon: <Terminal className="h-4 w-4" />,
            title: "Character counter",
            desc: "Tweet length tracked live so you never go over 280.",
          },
          {
            icon: <Zap className="h-4 w-4" />,
            title: "Instant generation",
            desc: "2-3 seconds from update to 5 ready-to-post pieces of content.",
          },
          {
            icon: <ArrowRight className="h-4 w-4" />,
            title: "One-click copy",
            desc: "Copy any output to clipboard. Paste anywhere.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="text-zinc-600 mb-3">{f.icon}</div>
            <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-xs font-mono text-zinc-700 mb-4">$ shipcast --analyze</p>
        <h2 className="text-3xl font-bold mb-4">Stop building in silence.</h2>
        <p className="text-zinc-500 mb-8 text-sm">
          Enter your URL. We&apos;ll build your marketing system in seconds.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="bg-white text-black hover:bg-zinc-200 px-8 h-11">
            Get started free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-zinc-700 mt-4">No credit card required.</p>
      </section>

      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-800 text-xs font-mono">
        &copy; {new Date().getFullYear()} Shipcast — built for founders who ship
      </footer>
    </div>
  );
}
