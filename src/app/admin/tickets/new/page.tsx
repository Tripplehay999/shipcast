import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { NewTicketForm } from "@/components/admin/new-ticket-form";

export default async function NewTicketPage() {
  const adminId = await requireAdmin();

  // Fetch all users for the user selector
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("clerk_user_id, product_name")
    .order("product_name", { ascending: true });

  const users = (profiles ?? []).map((p) => ({
    id: p.clerk_user_id,
    name: p.product_name ?? p.clerk_user_id.slice(0, 20),
  }));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">New Ticket</h1>
        <p className="text-zinc-500 text-sm mt-1">Create an internal ticket or user support request.</p>
      </div>
      <NewTicketForm users={users} adminId={adminId} />
    </div>
  );
}
