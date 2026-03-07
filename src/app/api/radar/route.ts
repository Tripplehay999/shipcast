import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/parse-json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface HNStory {
  title: string;
  points: number;
  num_comments: number;
  url: string | null;
}

interface Suggestion {
  trend: string;
  context: string;
  angle: string;
  hook: string;
  platform: "tweet" | "linkedin" | "thread";
  why_now: string;
}

async function fetchHNTrends(): Promise<HNStory[]> {
  const cutoff = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
  const queries = ["AI startup founder", "SaaS product launch", "indie hacker", "startup growth marketing"];

  const results = await Promise.allSettled(
    queries.map((q) =>
      fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${cutoff}&hitsPerPage=8`,
        { next: { revalidate: 3600 } }
      ).then((r) => r.json())
    )
  );

  const stories: HNStory[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const hits = result.value?.hits ?? [];
    for (const h of hits) {
      if (h.title && !seen.has(h.title)) {
        seen.add(h.title);
        stories.push({
          title: h.title,
          points: h.points ?? 0,
          num_comments: h.num_comments ?? 0,
          url: h.url ?? null,
        });
      }
    }
  }

  // Sort by engagement (points + comments)
  return stories.sort((a, b) => (b.points + b.num_comments) - (a.points + a.num_comments)).slice(0, 20);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("product_name, product_description, brand_voice")
    .eq("clerk_user_id", userId)
    .single();

  const stories = await fetchHNTrends();

  if (!stories.length) {
    return NextResponse.json({ error: "Could not fetch trends" }, { status: 500 });
  }

  const trendList = stories.map((s, i) => `${i + 1}. "${s.title}" (${s.points} points, ${s.num_comments} comments)`).join("\n");

  const prompt = `You are a marketing strategist helping startup founders create timely, relevant content.

Here are the top trending topics from Hacker News in the last 48 hours:
${trendList}

Founder's product: ${profile?.product_name ?? "a startup product"}
What it does: ${profile?.product_description ?? "not specified"}
Brand voice: ${profile?.brand_voice ?? "casual"}

Generate 6 marketing angle suggestions. Each should:
- Tie a real trending topic to this founder's product or audience
- Give them a unique angle that isn't obvious
- Include a compelling hook they can post TODAY
- Specify the best platform for this angle

Return JSON only:
{
  "suggestions": [
    {
      "trend": "short trend label (3-5 words)",
      "context": "1 sentence explaining why this topic is hot right now",
      "angle": "1 sentence: the unique marketing angle for this founder",
      "hook": "the actual post opening line (1-2 sentences, ready to publish)",
      "platform": "tweet" | "linkedin" | "thread",
      "why_now": "1 sentence: why posting about this TODAY matters"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = extractJson(text);
  if (!jsonStr) return NextResponse.json({ error: "Parse failed" }, { status: 500 });

  const parsed = JSON.parse(jsonStr) as { suggestions: Suggestion[] };

  return NextResponse.json({
    suggestions: parsed.suggestions,
    fetchedAt: new Date().toISOString(),
    storiesAnalyzed: stories.length,
  });
}
