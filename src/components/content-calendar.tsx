"use client";

import { useState } from "react";
import { Twitter, Linkedin, MessageCircle, ChevronLeft, ChevronRight, List, CalendarDays, Loader2, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ScheduledPost {
  id: string;
  platform: "twitter" | "linkedin" | "threads";
  content: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  error: string | null;
}

const platformIcon = {
  twitter: <Twitter className="h-3 w-3" />,
  linkedin: <Linkedin className="h-3 w-3" />,
  threads: <MessageCircle className="h-3 w-3" />,
};

const platformColor = {
  twitter: "text-sky-400",
  linkedin: "text-blue-400",
  threads: "text-purple-400",
};

const statusStyle = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  posted:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed:  "bg-red-500/10 text-red-400 border-red-500/20",
};

// Compact card for week/month views (no actions — too small)
function PostCard({ post }: { post: ScheduledPost }) {
  const time = new Date(post.scheduled_at).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
  return (
    <div className={`rounded-lg border p-2 text-xs space-y-1 ${
      post.status === "posted" ? "border-zinc-800 bg-zinc-900/40 opacity-60"
      : post.status === "failed" ? "border-red-900/40 bg-red-950/20"
      : "border-zinc-700 bg-zinc-900"
    }`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`flex items-center gap-1 font-medium ${platformColor[post.platform] ?? "text-zinc-400"}`}>
          {platformIcon[post.platform]}
          {time}
        </span>
        <Badge className={`${statusStyle[post.status]} text-[9px] px-1 py-0 border`}>
          {post.status}
        </Badge>
      </div>
      <p className="text-zinc-400 line-clamp-2 leading-relaxed">{post.content}</p>
      {post.error && <p className="text-red-400 text-[10px]">{post.error}</p>}
    </div>
  );
}

function WeekView({ posts, weekStart }: { posts: ScheduledPost[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date().toDateString();

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const key = day.toDateString();
        const dayPosts = posts
          .filter((p) => new Date(p.scheduled_at).toDateString() === key)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        const isToday = key === today;

        return (
          <div key={key} className="min-h-[160px]">
            <div className={`text-center mb-2 pb-2 border-b ${isToday ? "border-white/20" : "border-zinc-800"}`}>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className={`text-sm font-bold ${isToday ? "text-white" : "text-zinc-400"}`}>{day.getDate()}</p>
              {isToday && <div className="h-1 w-1 rounded-full bg-white mx-auto mt-1" />}
            </div>
            <div className="space-y-1.5">
              {dayPosts.map((p) => <PostCard key={p.id} post={p} />)}
              {dayPosts.length === 0 && <div className="h-8 rounded border border-dashed border-zinc-900" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ posts, month, year }: { posts: ScheduledPost[]; month: number; year: number }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] text-zinc-600 uppercase tracking-widest py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-16" />;
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const dayPosts = posts.filter((p) => new Date(p.scheduled_at).toDateString() === date.toDateString());
          const pending = dayPosts.filter((p) => p.status === "pending").length;
          const posted = dayPosts.filter((p) => p.status === "posted").length;

          return (
            <div key={day} className={`h-16 rounded-lg border p-1.5 ${isToday ? "border-white/30 bg-white/5" : "border-zinc-800 bg-zinc-950"}`}>
              <p className={`text-xs font-medium mb-1 ${isToday ? "text-white" : "text-zinc-500"}`}>{day}</p>
              <div className="space-y-0.5">
                {pending > 0 && <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" /><span className="text-[9px] text-zinc-500">{pending} scheduled</span></div>}
                {posted > 0 && <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" /><span className="text-[9px] text-zinc-500">{posted} posted</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListRow({
  post,
  onDelete,
  onPosted,
}: {
  post: ScheduledPost;
  onDelete: (id: string) => void;
  onPosted: (id: string) => void;
}) {
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const postNow = async () => {
    setPosting(true);
    try {
      const res = await fetch("/api/post/now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: post.platform, content: post.content }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Post failed");
      // Mark as posted in DB
      await fetch("/api/schedule/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      }).catch(() => {});
      onPosted(post.id);
      toast.success(`Posted to ${post.platform}!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      onDelete(post.id);
      toast.success("Post removed from queue");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-zinc-800/60 last:border-0">
      {/* Date/time */}
      <div className="text-right shrink-0 w-20">
        <p className="text-xs text-zinc-400">
          {new Date(post.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        <p className="text-xs text-zinc-600">
          {new Date(post.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      {/* Platform */}
      <div className={`flex items-center gap-1 text-xs font-medium shrink-0 pt-0.5 ${platformColor[post.platform] ?? "text-zinc-400"}`}>
        {platformIcon[post.platform]}
        <span className="capitalize">{post.platform}</span>
      </div>

      {/* Content */}
      <p className="flex-1 text-sm text-zinc-300 line-clamp-2 leading-relaxed">{post.content}</p>

      {/* Status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={`${statusStyle[post.status]} text-[10px]`}>{post.status}</Badge>
        {post.status === "pending" && (
          <>
            <button
              type="button"
              onClick={postNow}
              disabled={posting || deleting}
              title="Post now"
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
            >
              {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              {posting ? "Posting…" : "Post now"}
            </button>
            <button
              type="button"
              onClick={deletePost}
              disabled={posting || deleting}
              title="Remove from queue"
              className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
        {post.error && <p className="text-xs text-red-400 max-w-[120px] truncate" title={post.error}>{post.error}</p>}
      </div>
    </div>
  );
}

function ListView({
  posts,
  onDelete,
  onPosted,
}: {
  posts: ScheduledPost[];
  onDelete: (id: string) => void;
  onPosted: (id: string) => void;
}) {
  const pending = posts.filter((p) => p.status === "pending");
  const done = posts.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Upcoming</p>
          <div className="border border-zinc-800 rounded-xl px-4 bg-zinc-900/40">
            {pending.map((p) => (
              <ListRow key={p.id} post={p} onDelete={onDelete} onPosted={onPosted} />
            ))}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Past</p>
          <div className="border border-zinc-800 rounded-xl px-4 bg-zinc-900/40">
            {done.map((p) => (
              <ListRow key={p.id} post={p} onDelete={onDelete} onPosted={onPosted} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ContentCalendar({ posts: initialPosts }: { posts: ScheduledPost[] }) {
  const today = new Date();
  const [view, setView] = useState<"week" | "month" | "list">("list");
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekStart = new Date(today);
  const dow = today.getDay();
  weekStart.setDate(today.getDate() - ((dow + 6) % 7) + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const displayMonth = (today.getMonth() + monthOffset + 120) % 12;
  const displayYear = today.getFullYear() + Math.floor((today.getMonth() + monthOffset) / 12);
  const monthName = new Date(displayYear, displayMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const handlePosted = (id: string) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: "posted" as const } : p));

  if (!posts.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <CalendarDays className="h-10 w-10 text-zinc-800 mx-auto" />
        <p className="text-zinc-500 text-sm">No scheduled posts yet.</p>
        <p className="text-xs text-zinc-700">Generate content from the GitHub tab or New Update to queue posts here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {(["list", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === v ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              {v === "list" ? <List className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view !== "list" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => view === "week" ? setWeekOffset((o) => o - 1) : setMonthOffset((o) => o - 1)}
              className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm text-zinc-400 min-w-[160px] text-center">
              {view === "week" ? weekLabel : monthName}
            </span>
            <button
              onClick={() => view === "week" ? setWeekOffset((o) => o + 1) : setMonthOffset((o) => o + 1)}
              className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {view === "list"  && <ListView posts={posts} onDelete={handleDelete} onPosted={handlePosted} />}
      {view === "week"  && <WeekView posts={posts} weekStart={weekStart} />}
      {view === "month" && <MonthView posts={posts} month={displayMonth} year={displayYear} />}
    </div>
  );
}
