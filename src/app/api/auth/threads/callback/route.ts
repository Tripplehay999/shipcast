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

  if (error || !code) return NextResponse.redirect(`${appUrl}/connected-accounts?error=threads_denied`);

  const cookieStore = await cookies();
  const storedState = cookieStore.get("threads_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=invalid_state`);
  }

  // Exchange code for short-lived token
  const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/auth/threads/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${appUrl}/connected-accounts?error=token_exchange`);
  const shortToken = await tokenRes.json();

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${process.env.THREADS_APP_SECRET}&access_token=${shortToken.access_token}`
  );
  const longToken = longRes.ok ? await longRes.json() : shortToken;

  // Get user profile
  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${longToken.access_token}`
  );
  const profile = profileRes.ok ? await profileRes.json() : { id: shortToken.user_id, username: "threads_user" };

  await supabaseAdmin.from("connected_accounts").upsert(
    {
      clerk_user_id: userId,
      platform: "threads",
      platform_user_id: profile.id ?? shortToken.user_id,
      platform_username: profile.username ?? "threads_user",
      access_token: longToken.access_token,
      refresh_token: null,
      expires_at: new Date(Date.now() + (longToken.expires_in ?? 5184000) * 1000).toISOString(),
    },
    { onConflict: "clerk_user_id,platform" }
  );

  cookieStore.delete("threads_state");
  return NextResponse.redirect(`${appUrl}/connected-accounts?connected=threads`);
}
