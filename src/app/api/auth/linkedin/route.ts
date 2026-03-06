import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

function base64url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));

  const state = base64url(crypto.randomBytes(16));
  const cookieStore = await cookies();
  cookieStore.set("linkedin_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
    scope: "openid profile email w_member_social",
    state,
  });

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}
