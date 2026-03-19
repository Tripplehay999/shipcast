import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  let pageText = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Shipcast/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
  } catch {
    return NextResponse.json(
      { error: "Could not fetch that URL. Try entering your product details manually." },
      { status: 400 }
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Analyze this product webpage and extract marketing-relevant information.

URL: ${url}
Page content: ${pageText}

Return ONLY valid JSON, no explanation:
{
  "productName": "product name",
  "productDescription": "1-2 sentence description of what it does and who it helps",
  "targetAudience": "primary audience (e.g. freelancers, startup founders, developers)",
  "coreFeatures": ["feature 1", "feature 2", "feature 3"],
  "category": "product category"
}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
