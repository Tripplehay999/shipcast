import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SupportClient } from "@/components/support/support-client";

export default async function SupportPage() {
  const { userId } = await auth();

  const { data: tickets } = await supabaseAdmin
    .from("admin_tickets")
    .select("id, subject, body, status, priority, created_at, updated_at, resolved_at")
    .eq("user_clerk_id", userId!)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Get help, report issues, or share feedback. We&apos;ll respond within 24 hours.
        </p>
      </div>
      <SupportClient initialTickets={tickets ?? []} />
    </div>
  );
}
