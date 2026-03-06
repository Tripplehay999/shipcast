import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { LaunchKitClient } from "@/components/launch-kit-client";
import { Rocket, Clock } from "lucide-react";
import Link from "next/link";

export default async function LaunchKitPage() {
  const { userId } = await auth();

  const [{ data: profile }, { data: savedKits }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("product_name, product_description")
      .eq("clerk_user_id", userId)
      .single(),
    supabaseAdmin
      .from("launch_kits")
      .select("id, description, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

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

      {/* Saved kits */}
      {savedKits && savedKits.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Previous kits
          </p>
          <div className="space-y-2">
            {savedKits.map((kit) => (
              <Link
                key={kit.id}
                href={`/launch-kit/${kit.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 hover:border-zinc-700 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                    {kit.description.slice(0, 80)}{kit.description.length > 80 ? "…" : ""}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(kit.created_at).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 ml-4">
                  View →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <LaunchKitClient defaultProductName={profile?.product_name ?? ""} />
    </div>
  );
}
