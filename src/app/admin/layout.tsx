import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Github,
  Zap,
  ArrowLeft,
  ShieldCheck,
  Ticket,
  Tag,
  ShieldAlert,
} from "lucide-react";

async function getBadgeCounts() {
  const [{ count: openTickets }, { count: activeFlags }, { count: pendingEvents }] =
    await Promise.all([
      supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("user_flags").select("*", { count: "exact", head: true }).is("resolved_at", null),
      supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
    ]);
  return { openTickets: openTickets ?? 0, activeFlags: activeFlags ?? 0, pendingEvents: pendingEvents ?? 0 };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { openTickets, activeFlags, pendingEvents } = await getBadgeCounts();

  const NAV = [
    { href: "/admin",           label: "Overview",    icon: LayoutDashboard, badge: 0 },
    { href: "/admin/users",     label: "Users",       icon: Users,           badge: activeFlags },
    { href: "/admin/posts",     label: "Posts",       icon: CalendarClock,   badge: 0 },
    { href: "/admin/tickets",   label: "Tickets",     icon: Ticket,          badge: openTickets },
    { href: "/admin/coupons",   label: "Coupons",     icon: Tag,             badge: 0 },
    { href: "/admin/github",    label: "GitHub",      icon: Github,          badge: 0 },
    { href: "/admin/events",    label: "Events",      icon: Zap,             badge: pendingEvents },
    { href: "/admin/security",  label: "Security",    icon: ShieldAlert,     badge: activeFlags },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-white tracking-tight">Admin Panel</span>
          </div>
          <p className="text-[10px] text-zinc-600 pl-6">Shipcast internal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium tabular-nums min-w-[18px] text-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-zinc-800/60">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
