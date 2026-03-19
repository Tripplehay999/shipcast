import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (error) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: data });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productName, productDescription, brandVoice, examplePosts, productLink } = await req.json();

  const allowedVoices = ["casual", "professional", "developer"];
  if (brandVoice && !allowedVoices.includes(brandVoice)) {
    return NextResponse.json({ error: "Invalid brand voice" }, { status: 400 });
  }
  if (examplePosts !== undefined && (!Array.isArray(examplePosts) || examplePosts.some((p: unknown) => typeof p !== "string"))) {
    return NextResponse.json({ error: "examplePosts must be an array of strings" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        product_name: productName,
        product_description: productDescription,
        brand_voice: brandVoice,
        example_posts: examplePosts,
        ...(productLink !== undefined && { product_link: productLink || null }),
      },
      { onConflict: "clerk_user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
