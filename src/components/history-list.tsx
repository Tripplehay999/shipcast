"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContentTabs } from "@/components/content-tabs";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GeneratedContent {
  tweet: string;
  thread: string[];
  linkedin: string;
  reddit: string;
  indie_hackers: string;
  blog_draft?: string;
  email_subject?: string;
  email_body?: string;
  changelog_entry?: string;
}

interface Update {
  id: string;
  raw_update: string;
  created_at: string;
  // Supabase returns foreign key joins as arrays
  generated_content: GeneratedContent | GeneratedContent[] | null;
}

function HistoryItem({ update }: { update: Update }) {
  const [expanded, setExpanded] = useState(false);

  // Supabase returns 1:1 joins as arrays — normalize to single object
  const gc = Array.isArray(update.generated_content)
    ? update.generated_content[0] ?? null
    : update.generated_content;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-0">
        <button
          className="w-full text-left p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors rounded-xl"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{update.raw_update}</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date(update.created_at).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-600 ml-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-600 ml-4 shrink-0" />
          )}
        </button>

        {expanded && gc && (
          <div className="px-4 pb-4">
            <ContentTabs content={{
              tweet: gc.tweet ?? "",
              thread: Array.isArray(gc.thread) ? gc.thread : [],
              linkedin: gc.linkedin ?? "",
              reddit: gc.reddit ?? "",
              indie_hackers: gc.indie_hackers ?? "",
              blog_draft: gc.blog_draft ?? "",
              email_subject: gc.email_subject ?? "",
              email_body: gc.email_body ?? "",
              changelog_entry: gc.changelog_entry ?? "",
            }} />
          </div>
        )}

        {expanded && !gc && (
          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-600">No generated content for this update.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoryList({ updates }: { updates: Update[] }) {
  if (updates.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
        <p className="text-zinc-500 mb-4">No updates yet.</p>
        <Link href="/new-update">
          <Button className="bg-white text-black hover:bg-zinc-200">
            Ship your first update
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <HistoryItem key={update.id} update={update} />
      ))}
    </div>
  );
}
