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

  const { productName, productDescription, brandVoice, examplePosts } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        product_name: productName,
        product_description: productDescription,
        brand_voice: brandVoice,
        example_posts: examplePosts,
      },
      { onConflict: "clerk_user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
