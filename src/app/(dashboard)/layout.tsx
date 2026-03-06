import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, PlusCircle, History, Settings, Zap, Link2, CalendarClock, CreditCard } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-update", label: "New Update", icon: PlusCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/connected-accounts", label: "Accounts", icon: Link2 },
  { href: "/schedule", label: "Post Queue", icon: CalendarClock },
];

const bottomItems = [
  { href: "/pricing", label: "Upgrade", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-zinc-900 flex flex-col py-6 px-4 fixed h-full">
        <div className="flex items-center gap-2 px-2 mb-8">
          <Zap className="h-5 w-5 text-white" />
          <span className="font-bold text-lg tracking-tight">Shipcast</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-1 mb-4">
          {bottomItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        <div className="px-2 pt-4 border-t border-zinc-900">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  );
}
