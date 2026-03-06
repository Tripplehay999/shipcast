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
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=linkedin_denied`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("linkedin_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=invalid_state`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/auth/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/connected-accounts?error=token_exchange`);
  }

  const tokens = await tokenRes.json();

  // Get LinkedIn profile
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();

  await supabaseAdmin.from("connected_accounts").upsert(
    {
      clerk_user_id: userId,
      platform: "linkedin",
      platform_user_id: profile.sub,
      platform_username: profile.name ?? profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    },
    { onConflict: "clerk_user_id,platform" }
  );

  cookieStore.delete("linkedin_state");

  return NextResponse.redirect(`${appUrl}/connected-accounts?connected=linkedin`);
}
