import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { LaunchKitDisplay } from "@/components/launch-kit-display";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SavedLaunchKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;

  const { data: saved } = await supabaseAdmin
    .from("launch_kits")
    .select("*")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .single();

  if (!saved) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/launch-kit" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Launch Kit
        </Link>
        <h1 className="text-2xl font-bold">Launch Kit</h1>
        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{saved.description}</p>
        <p className="text-xs text-zinc-700 mt-1">
          Generated {new Date(saved.created_at).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>
      <LaunchKitDisplay kit={saved.kit} />
    </div>
  );
}
