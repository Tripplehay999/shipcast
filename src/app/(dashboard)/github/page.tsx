import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GitHubClient } from "@/components/github-client";
import { Github } from "lucide-react";

export default async function GitHubPage() {
  const { userId } = await auth();

  const { data: conn } = await supabaseAdmin
    .from("github_connections")
    .select("repo_full_name, auto_generate, auto_schedule, created_at")
    .eq("clerk_user_id", userId)
    .single();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Github className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">GitHub Integration</h1>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Connect your repo and Shipcast automatically turns <code className="text-zinc-400 bg-zinc-800 px-1 rounded text-xs">feat:</code> and <code className="text-zinc-400 bg-zinc-800 px-1 rounded text-xs">fix:</code> commits into marketing content the moment you push.
        </p>
      </div>
      <GitHubClient connection={conn} />
    </div>
  );
}
