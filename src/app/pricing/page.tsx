import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { PLANS } from "@/lib/plans";

const planKeys = ["free", "pro", "studio"] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto border-b border-zinc-900">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="font-bold text-lg tracking-tight">Shipcast</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-white text-black hover:bg-zinc-200">Get started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-mono text-zinc-600 mb-3">pricing</p>
          <h1 className="text-4xl font-bold mb-3">Simple, founder-friendly pricing</h1>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">
            Start free. Upgrade when you&apos;re ready to go on autopilot.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {planKeys.map((key) => {
            const plan = PLANS[key];
            const isStudio = key === "studio";
            const isPro = key === "pro";

            return (
              <div
                key={key}
                className={`rounded-xl border p-6 flex flex-col ${
                  isStudio
                    ? "border-white bg-zinc-950"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                {isStudio && (
                  <div className="text-xs font-mono text-white bg-zinc-800 rounded-full px-3 py-1 w-fit mb-4">
                    Most powerful
                  </div>
                )}
                {isPro && (
                  <div className="text-xs font-mono text-zinc-400 bg-zinc-900 rounded-full px-3 py-1 w-fit mb-4">
                    Popular
                  </div>
                )}
                {!isStudio && !isPro && <div className="mb-8" />}

                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1 font-mono">{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-zinc-500 text-sm mb-1">/month</span>}
                </div>
                <p className="text-sm text-zinc-500 mb-6">{plan.description}</p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={key === "free" ? "/sign-up" : `/sign-up?plan=${key}`}>
                  <Button
                    className={`w-full ${
                      isStudio
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "border border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
                    }`}
                  >
                    {key === "free" ? "Get started free" : `Start ${plan.name}`}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-950 p-8 grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-mono text-zinc-600 mb-2">studio plan</p>
            <h2 className="text-xl font-bold mb-2">We handle the API costs</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Studio subscribers get fully managed posting. We cover the Twitter and LinkedIn API costs so you never have to think about credentials, rate limits, or integrations. Just connect your accounts and schedule.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Twitter / X API — covered",
              "LinkedIn API — covered",
              "Automatic retry on failure",
              "Post queue dashboard",
              "Cancel anytime",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
