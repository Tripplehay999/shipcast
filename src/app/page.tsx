import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Layers, Clock, Terminal, GitCommit, BarChart2, Globe } from "lucide-react";
import { TerminalDemo } from "@/components/terminal-demo";
import { auth } from "@clerk/nextjs/server";

const platforms = ["Twitter / X", "LinkedIn", "Reddit", "Indie Hackers", "Dev.to", "Product Hunt"];

const steps = [
  {
    number: "01",
    title: "You type one sentence",
    desc: "What did you ship? A feature, a fix, a milestone. Plain English. No formatting needed.",
    code: `"Added Stripe subscription billing\nwith annual/monthly toggle."`,
  },
  {
    number: "02",
    title: "Shipcast understands context",
    desc: "The AI reads your product profile, your brand voice, and your example posts to generate content that actually sounds like you.",
    code: `model: claude-sonnet-4-6\nvoice: casual_founder\nplatforms: [twitter, linkedin,\n  reddit, indie_hackers]`,
  },
  {
    number: "03",
    title: "5 posts, ready in seconds",
    desc: "Every output is platform-native. A tweet reads like a tweet. A Reddit post reads like genuine community engagement, not marketing.",
    code: `✓ tweet        (272 chars)\n✓ thread       (5 tweets)\n✓ linkedin     (198 words)\n✓ reddit       (community tone)\n✓ indie_hackers (progress update)`,
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
                <Button variant="ghost" className="text-zinc-400 hover:text-white">Sign in</Button>
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
          You build it.
          <br />
          <span className="text-zinc-600">We market it.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Type what you shipped. Shipcast turns it into platform-native content for{" "}
          <span className="text-zinc-300">Twitter, LinkedIn, Reddit, and more</span> — in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link href="/sign-up">
            <Button size="lg" className="bg-white text-black hover:bg-zinc-200 px-8 h-11">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-zinc-700">No credit card. No scheduling setup. Just ship.</p>

        <TerminalDemo />
      </main>

      {/* Platform pills */}
      <section className="max-w-3xl mx-auto px-6 py-10 text-center">
        <p className="text-xs text-zinc-700 uppercase tracking-widest mb-5 font-mono">content generated for</p>
        <div className="flex flex-wrap justify-center gap-2">
          {platforms.map((p) => (
            <span key={p} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-full font-mono">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-12 text-center font-mono">how it works</p>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.number} className="grid sm:grid-cols-2 gap-6 items-center border border-zinc-900 rounded-xl p-6 bg-zinc-950">
              <div>
                <p className="text-xs font-mono text-zinc-700 mb-3">{step.number}</p>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
              <div className="rounded-lg bg-black border border-zinc-800 p-4 font-mono text-sm text-emerald-400 whitespace-pre">
                {step.code}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Voice selector */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-mono">brand voice</p>
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

      {/* The real differentiator */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 grid sm:grid-cols-2 gap-10">
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4 font-mono">other tools ask</p>
            <p className="text-2xl font-bold text-zinc-600 mb-3">&ldquo;What do you want to post today?&rdquo;</p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              And you stare at a blank box. You have a product to build. You don&apos;t have time to be a content creator.
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4 font-mono">shipcast asks</p>
            <p className="text-2xl font-bold text-white mb-3">&ldquo;What did you build today?&rdquo;</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              That&apos;s a question you can answer. Every feature, every fix, every milestone becomes a content pipeline — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <GitCommit className="h-4 w-4" />, title: "One input", desc: "Write once, get 5 platform-optimized posts back instantly." },
          { icon: <Layers className="h-4 w-4" />, title: "Voice matching", desc: "Add example posts. The AI learns your exact writing style." },
          { icon: <BarChart2 className="h-4 w-4" />, title: "Inline editing", desc: "Every output is editable. Tweak before you copy." },
          { icon: <Globe className="h-4 w-4" />, title: "Platform-native", desc: "Reddit posts that sound like Reddit. Threads that read like threads." },
          { icon: <Clock className="h-4 w-4" />, title: "History log", desc: "Every update and its generated content saved forever." },
          { icon: <Terminal className="h-4 w-4" />, title: "Character counter", desc: "Tweet length tracked live so you never go over 280." },
          { icon: <Zap className="h-4 w-4" />, title: "Instant generation", desc: "2-3 seconds from update to 5 ready-to-post pieces of content." },
          { icon: <ArrowRight className="h-4 w-4" />, title: "One-click copy", desc: "Copy any output to clipboard. Paste anywhere." },
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
        <p className="text-xs font-mono text-zinc-700 mb-4">$ shipcast --start</p>
        <h2 className="text-3xl font-bold mb-4">Stop building in silence.</h2>
        <p className="text-zinc-500 mb-8 text-sm">
          Every update you ship is a post waiting to be written. Let Shipcast write it.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="bg-white text-black hover:bg-zinc-200 px-8 h-11">
            Get started free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-zinc-700 mt-4">No credit card required.</p>
      </section>

      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-800 text-xs font-mono">
        © {new Date().getFullYear()} Shipcast — built for founders who ship
      </footer>
    </div>
  );
}
