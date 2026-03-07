import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));

  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("github_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: "repo",
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
