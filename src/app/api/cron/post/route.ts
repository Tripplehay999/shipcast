import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Called by Vercel Cron (or manually). Processes all pending posts due now.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: duePosts } = await supabaseAdmin
    .from("scheduled_posts")
    .select("*, connected_accounts!inner(access_token, platform_user_id)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(50);

  if (!duePosts?.length) return NextResponse.json({ processed: 0 });

  let processed = 0;
  for (const post of duePosts) {
    const { data: account } = await supabaseAdmin
      .from("connected_accounts")
      .select("access_token, platform_user_id")
      .eq("clerk_user_id", post.clerk_user_id)
      .eq("platform", post.platform)
      .single();

    if (!account) {
      await supabaseAdmin
        .from("scheduled_posts")
        .update({ status: "failed", error: "Account not connected", posted_at: now })
        .eq("id", post.id);
      continue;
    }

    try {
      if (post.platform === "twitter") {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: post.content }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else if (post.platform === "linkedin") {
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            author: `urn:li:person:${account.platform_user_id}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: post.content },
                shareMediaCategory: "NONE",
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      await supabaseAdmin
        .from("scheduled_posts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", post.id);

      processed++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabaseAdmin
        .from("scheduled_posts")
        .update({ status: "failed", error: message, posted_at: new Date().toISOString() })
        .eq("id", post.id);
    }
  }

  return NextResponse.json({ processed });
}
