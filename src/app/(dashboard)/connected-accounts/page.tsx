import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ConnectedAccountsClient } from "@/components/connected-accounts-client";

export default async function ConnectedAccountsPage() {
  const { userId } = await auth();

  const [{ data: accounts }, { data: githubConn }] = await Promise.all([
    supabaseAdmin
      .from("connected_accounts")
      .select("platform, platform_username, created_at")
      .eq("clerk_user_id", userId!),
    supabaseAdmin
      .from("github_connections")
      .select("repo_full_name, created_at")
      .eq("clerk_user_id", userId!)
      .single(),
  ]);

  const connected = {
    twitter: accounts?.find((a) => a.platform === "twitter") ?? null,
    linkedin: accounts?.find((a) => a.platform === "linkedin") ?? null,
    threads: accounts?.find((a) => a.platform === "threads") ?? null,
  };

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourapp.com";

  const setupItems = [
    {
      platform: "Twitter / X",
      status: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
      steps: [
        "Go to developer.twitter.com → Projects & Apps → New App",
        "Set App Type: Web App. Enable OAuth 2.0.",
        `Add callback URL: ${APP_URL}/api/auth/twitter/callback`,
        "Request Read + Write permissions under User Auth Settings",
        "Copy Client ID + Client Secret → TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET",
      ],
    },
    {
      platform: "LinkedIn",
      status: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      steps: [
        "Go to linkedin.com/developers → Create app",
        `Add OAuth 2.0 redirect URL: ${APP_URL}/api/auth/linkedin/callback`,
        "Request scopes: openid, profile, email, w_member_social",
        "Apply for Marketing Developer Platform access (required for w_member_social)",
        "Copy Client ID + Client Secret → LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET",
      ],
    },
    {
      platform: "Threads (Meta)",
      status: !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET),
      steps: [
        "Go to developers.facebook.com → Create App → Consumer type",
        "Add the Threads product to your app",
        `Set OAuth redirect URI: ${APP_URL}/api/auth/threads/callback`,
        "Enable scopes: threads_basic, threads_content_publish",
        "Copy App ID + App Secret → THREADS_APP_ID / THREADS_APP_SECRET",
      ],
    },
    {
      platform: "GitHub",
      status: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      steps: [
        "Go to github.com/settings/developers → OAuth Apps → New OAuth App",
        `Set callback URL: ${APP_URL}/api/auth/github/callback`,
        `Register a webhook on your repo pointing to: ${APP_URL}/api/github/webhook`,
        "Set webhook Content-Type to application/json and pick a secret",
        "Copy Client ID + Client Secret → GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET",
      ],
    },
    {
      platform: "Stripe",
      status: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID),
      steps: [
        "Go to dashboard.stripe.com → Developers → Webhooks → Add endpoint",
        `Endpoint URL: ${APP_URL}/api/stripe/webhook`,
        "Listen for: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted",
        "Create two products: Pro ($12/mo) and Studio ($49/mo) — copy their Price IDs",
        "Set STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, STRIPE_STUDIO_PRICE_ID, STRIPE_WEBHOOK_SECRET",
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Connected accounts</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Link your social accounts. Available on all plans — posting and scheduling require Studio.
        </p>
      </div>
      <ConnectedAccountsClient connected={connected} github={githubConn ?? null} />

      {/* API Setup Guide */}
      <div className="mt-10 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">Developer Setup Required</span>
          <span className="text-xs text-zinc-700">— configure these in each platform&apos;s developer portal</span>
        </div>
        {setupItems.map((item) => (
          <details key={item.platform} className="group rounded-xl border border-zinc-800 bg-zinc-900/50">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${item.status ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-sm font-medium text-zinc-300">{item.platform}</span>
              </div>
              <span className="text-xs text-zinc-600">
                {item.status ? "Keys set — configure portal ↓" : "Keys missing + portal setup needed ↓"}
              </span>
            </summary>
            <ol className="px-4 pb-4 pt-2 space-y-1.5 border-t border-zinc-800">
              {item.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-500 leading-relaxed">
                  <span className="text-zinc-700 shrink-0 font-mono mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-start gap-3">
          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-1">Vercel Cron (auto-posting)</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Scheduled posts are processed daily at 9am UTC via <code className="text-zinc-400 bg-zinc-800 px-1 rounded">/api/cron/post</code>.
              This only runs when deployed to Vercel — it won&apos;t fire in local dev.
              Set <code className="text-zinc-400 bg-zinc-800 px-1 rounded">CRON_SECRET</code> in your Vercel environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
