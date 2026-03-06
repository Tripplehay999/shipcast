"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Twitter, Linkedin, Clock, CheckCircle2, XCircle, CalendarClock } from "lucide-react";

interface ScheduledPost {
  id: string;
  platform: "twitter" | "linkedin";
  content: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  posted_at: string | null;
  error: string | null;
}

const platformIcon = {
  twitter: <Twitter className="h-3.5 w-3.5" />,
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
};

const statusBadge = {
  pending: <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Scheduled</Badge>,
  posted: <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Posted</Badge>,
  failed: <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</Badge>,
};

export function ScheduleClient({ posts }: { posts: ScheduledPost[] }) {
  if (!posts.length) {
    return (
      <div className="text-center py-16">
        <CalendarClock className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
        <p className="text-zinc-500 text-sm mb-2">No scheduled posts yet.</p>
        <p className="text-xs text-zinc-700">
          Generate content and use the Schedule button to queue posts here.
        </p>
      </div>
    );
  }

  const pending = posts.filter((p) => p.status === "pending");
  const done = posts.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Upcoming</p>
          <div className="space-y-3">
            {pending.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">History</p>
          <div className="space-y-3">
            {done.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PostCard({ post }: { post: ScheduledPost }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">{platformIcon[post.platform]}</span>
            <span className="text-xs text-zinc-500 capitalize">{post.platform}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge[post.status]}
            <span className="text-xs text-zinc-600">
              {new Date(post.scheduled_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">{post.content}</p>
        {post.error && (
          <p className="text-xs text-red-400 mt-2">Error: {post.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
