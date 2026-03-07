import Link from "next/link";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { LayoutDashboard, PlusCircle, History, Settings, Zap, Link2, CalendarClock, CreditCard, Rocket, LogOut, UserCircle2, BarChart3, Github } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-update", label: "New Update", icon: PlusCircle },
  { href: "/launch-kit", label: "Launch Kit", icon: Rocket },
  { href: "/history", label: "History", icon: History },
  { href: "/connected-accounts", label: "Accounts", icon: Link2 },
  { href: "/schedule", label: "Post Queue", icon: CalendarClock },
  { href: "/content-plan", label: "30-Day Plan", icon: BarChart3 },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/bio", label: "Bio Generator", icon: UserCircle2 },
];

const bottomItems = [
  { href: "/pricing", label: "Upgrade Plan", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const planBadge: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan")
    .eq("clerk_user_id", userId)
    .single();

  const plan = sub?.plan ?? "free";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <aside className="w-60 border-r border-zinc-900 flex flex-col py-6 px-4 fixed h-full">
        <div className="flex items-center gap-2 px-2 mb-8">
          <Zap className="h-5 w-5 text-white" />
          <span className="font-bold text-lg tracking-tight">Shipcast</span>
          <span className="ml-auto text-xs font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full capitalize">
            {planBadge[plan]}
          </span>
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

        <div className="space-y-1 mb-3">
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
          <SignOutButton redirectUrl="/">
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors w-full text-left">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </SignOutButton>
        </div>

        <div className="px-2 pt-4 border-t border-zinc-900">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  );
}
