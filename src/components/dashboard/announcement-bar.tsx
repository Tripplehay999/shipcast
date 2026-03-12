"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  dismissible: boolean;
  cta_label: string | null;
  cta_href: string | null;
}

const TYPE_STYLE: Record<string, { bar: string; icon: React.ElementType }> = {
  info:    { bar: "bg-blue-950/60 border-blue-800/60 text-blue-200",    icon: Info },
  warning: { bar: "bg-amber-950/60 border-amber-800/60 text-amber-200", icon: AlertTriangle },
  success: { bar: "bg-emerald-950/60 border-emerald-800/60 text-emerald-200", icon: CheckCircle2 },
  error:   { bar: "bg-red-950/60 border-red-800/60 text-red-200",       icon: XCircle },
};

function AnnouncementBanner({ a, onDismiss }: { a: Announcement; onDismiss: () => void }) {
  const { bar, icon: Icon } = TYPE_STYLE[a.type] ?? TYPE_STYLE.info;

  const dismiss = async () => {
    onDismiss();
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    }).catch(() => {});
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border rounded-xl text-sm ${bar}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{a.title}</p>
        {a.body && <p className="text-xs opacity-80 mt-0.5">{a.body}</p>}
        {a.cta_label && a.cta_href && (
          <Link
            href={a.cta_href}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium underline opacity-80 hover:opacity-100"
          >
            {a.cta_label}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      {a.dismissible && (
        <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" title="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d: { announcements?: Announcement[] }) => setAnnouncements(d.announcements ?? []))
      .catch(() => {});
  }, []);

  const dismiss = (id: string) => setAnnouncements((prev) => prev.filter((a) => a.id !== id));

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {announcements.map((a) => (
        <AnnouncementBanner key={a.id} a={a} onDismiss={() => dismiss(a.id)} />
      ))}
    </div>
  );
}
