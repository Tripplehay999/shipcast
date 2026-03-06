import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!userId) return NextResponse.redirect(`${appUrl}/sign-in`);

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=twitter_denied`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("twitter_state")?.value;
  const codeVerifier = cookieStore.get("twitter_code_verifier")?.value;

  if (!storedState || storedState !== state || !codeVerifier) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=invalid_state`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/auth/twitter/callback`,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=token_exchange`);
  }

  const tokens = await tokenRes.json();

  // Get Twitter user info
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userData = await userRes.json();
  const twitterUser = userData.data;

  await supabaseAdmin.from("connected_accounts").upsert(
    {
      clerk_user_id: userId,
      platform: "twitter",
      platform_user_id: twitterUser.id,
      platform_username: twitterUser.username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    },
    { onConflict: "clerk_user_id,platform" }
  );

  cookieStore.delete("twitter_code_verifier");
  cookieStore.delete("twitter_state");

  return NextResponse.redirect(`${appUrl}/connected-accounts?connected=twitter`);
}
