import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const { userId } = await auth();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Update your product profile and brand voice.
        </p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
