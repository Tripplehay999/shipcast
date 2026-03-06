import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { LaunchKitClient } from "@/components/launch-kit-client";
import { Rocket } from "lucide-react";

export default async function LaunchKitPage() {
  const { userId } = await auth();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, product_description")
    .eq("clerk_user_id", userId)
    .single();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Rocket className="h-5 w-5 text-white" />
          <h1 className="text-2xl font-bold">Launch Kit</h1>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Describe your launch in plain English. Get a complete, ready-to-publish package — Product Hunt, Hacker News, press release, email, social posts, one-liners, and image prompts.
        </p>
      </div>

      <LaunchKitClient defaultProductName={profile?.product_name ?? ""} />
    </div>
  );
}
