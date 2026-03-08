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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Connected accounts</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Link your social accounts. Available on all plans — posting and scheduling require Studio.
        </p>
      </div>
      <ConnectedAccountsClient connected={connected} github={githubConn ?? null} />
    </div>
  );
}
