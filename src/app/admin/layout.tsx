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
  ToggleLeft,
  Megaphone,
  BarChart2,
  Link2,
  Server,
  FileText,
} from "lucide-react";

async function getBadgeCounts() {
  const [
    { count: openTickets },
    { count: activeFlags },
    { count: pendingEvents },
    { count: aiErrors24h },
  ] = await Promise.all([
    supabaseAdmin.from("admin_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("user_flags").select("*", { count: "exact", head: true }).is("resolved_at", null),
    supabaseAdmin.from("marketing_event_candidates").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
    supabaseAdmin.from("ai_generation_logs").select("*", { count: "exact", head: true })
      .eq("success", false)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
  ]);
  return {
    openTickets: openTickets ?? 0,
    activeFlags: activeFlags ?? 0,
    pendingEvents: pendingEvents ?? 0,
    aiErrors24h: aiErrors24h ?? 0,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { openTickets, activeFlags, pendingEvents, aiErrors24h } = await getBadgeCounts();

  const NAV_SECTIONS = [
    {
      label: "Overview",
      items: [
        { href: "/admin",             label: "Dashboard",     icon: LayoutDashboard,  badge: 0 },
        { href: "/admin/ai-logs",     label: "AI Usage",      icon: BarChart2,         badge: aiErrors24h },
        { href: "/admin/system",      label: "System Health", icon: Server,            badge: 0 },
      ],
    },
    {
      label: "Users",
      items: [
        { href: "/admin/users",       label: "Users",         icon: Users,             badge: activeFlags },
        { href: "/admin/tickets",     label: "Tickets",       icon: Ticket,            badge: openTickets },
        { href: "/admin/security",    label: "Security",      icon: ShieldAlert,       badge: activeFlags },
      ],
    },
    {
      label: "Billing",
      items: [
        { href: "/admin/coupons",     label: "Coupons",       icon: Tag,               badge: 0 },
      ],
    },
    {
      label: "Content & Posts",
      items: [
        { href: "/admin/content",     label: "Gen History",   icon: FileText,          badge: 0 },
        { href: "/admin/posts",       label: "Post Queue",    icon: CalendarClock,     badge: 0 },
        { href: "/admin/events",      label: "Events",        icon: Zap,               badge: pendingEvents },
      ],
    },
    {
      label: "Integrations",
      items: [
        { href: "/admin/github",      label: "GitHub",        icon: Github,            badge: 0 },
        { href: "/admin/social",      label: "Social Accts",  icon: Link2,             badge: 0 },
      ],
    },
    {
      label: "Platform",
      items: [
        { href: "/admin/flags",       label: "Feature Flags", icon: ToggleLeft,        badge: 0 },
        { href: "/admin/announcements", label: "Announcements", icon: Megaphone,       badge: 0 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col overflow-y-auto">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-zinc-800/60 sticky top-0 bg-[#0a0a0a] z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-white tracking-tight">Admin Panel</span>
          </div>
          <p className="text-[10px] text-zinc-600 pl-6">Shipcast internal</p>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[9px] text-zinc-700 uppercase tracking-widest px-3 mb-1">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-xs">{label}</span>
                    {badge > 0 && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium tabular-nums min-w-[18px] text-center">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-zinc-800/60 sticky bottom-0 bg-[#0a0a0a]">
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
