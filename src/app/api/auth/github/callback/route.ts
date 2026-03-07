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

  if (error || !code) return NextResponse.redirect(`${appUrl}/github?error=denied`);

  const cookieStore = await cookies();
  const storedState = cookieStore.get("github_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/github?error=invalid_state`);
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: `${appUrl}/api/auth/github/callback`,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${appUrl}/github?error=token_exchange`);
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return NextResponse.redirect(`${appUrl}/github?error=token_exchange`);

  // Save connection (no repo selected yet)
  await supabaseAdmin.from("github_connections").upsert(
    { clerk_user_id: userId, access_token: accessToken },
    { onConflict: "clerk_user_id" }
  );

  cookieStore.delete("github_state");
  return NextResponse.redirect(`${appUrl}/github?connected=true`);
}
