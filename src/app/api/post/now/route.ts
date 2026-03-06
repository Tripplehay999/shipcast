import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserPlan } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const plan = await getUserPlan(userId);
    if (plan !== "studio") {
      return NextResponse.json({ error: "Studio plan required to post directly." }, { status: 403 });
    }

    const { platform, content } = await req.json() as { platform: "twitter" | "linkedin" | "threads"; content: string };

    // Get connected account tokens
    const { data: account } = await supabaseAdmin
      .from("connected_accounts")
      .select("access_token, platform_username, platform_user_id")
      .eq("clerk_user_id", userId)
      .eq("platform", platform)
      .single();

    if (!account) {
      return NextResponse.json({ error: `No ${platform} account connected.` }, { status: 400 });
    }

    if (platform === "twitter") {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.detail ?? "Twitter post failed");
      }

      const data = await res.json();
      return NextResponse.json({ success: true, tweetId: data.data?.id });
    }

    if (platform === "linkedin") {
      // Get LinkedIn user ID from connected account
      const { data: acct } = await supabaseAdmin
        .from("connected_accounts")
        .select("platform_user_id, access_token")
        .eq("clerk_user_id", userId)
        .eq("platform", "linkedin")
        .single();

      if (!acct) return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });

      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${acct.access_token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${acct.platform_user_id}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? "LinkedIn post failed");
      }

      return NextResponse.json({ success: true });
    }

    if (platform === "threads") {
      // Step 1: Create a media container
      const containerRes = await fetch(
        `https://graph.threads.net/v1.0/${account.platform_user_id ?? ""}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "TEXT",
            text: content,
            access_token: account.access_token,
          }),
        }
      );
      if (!containerRes.ok) throw new Error(await containerRes.text());
      const container = await containerRes.json();

      // Step 2: Publish the container
      const publishRes = await fetch(
        `https://graph.threads.net/v1.0/${account.platform_user_id ?? ""}/threads_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: account.access_token,
          }),
        }
      );
      if (!publishRes.ok) throw new Error(await publishRes.text());
      const published = await publishRes.json();
      return NextResponse.json({ success: true, threadId: published.id });
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Post failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
