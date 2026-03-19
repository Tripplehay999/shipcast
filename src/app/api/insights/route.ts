import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { formatStats, topAnnouncements, summary } = await req.json().catch(() => ({}));

  if (!formatStats?.length) {
    return NextResponse.json({ insight: "Generate more content through the Automation pipeline to unlock performance insights. The AI scores every post and learns what works for your audience." });
  }

  const prompt = `You are a marketing performance analyst for a startup founder.

Based on their content performance data, give them 2-3 specific, actionable insights. Be direct. Lead with the most surprising or useful finding. No generic advice.

Performance summary:
- Total scored posts: ${summary?.totalScored ?? 0}
- Overall average score: ${summary?.overallAvgScore ?? 0}/10
- Posts flagged for improvement: ${summary?.needsWork ?? 0}

Format performance (score/10):
${formatStats.map((f: { format: string; avgScore: number; avgHook: number; count: number }) => `${f.format}: ${f.avgScore}/10 (${f.count} posts, hook strength: ${f.avgHook}/10)`).join('\n')}

Top content:
${topAnnouncements?.slice(0, 3).map((a: { headline: string; avgScore: number }) => `"${a.headline}" — score: ${a.avgScore}/10`).join('\n')}

Write 2-3 insights as bullet points. Each should:
1. State what the data shows (specific numbers)
2. Tell them exactly what to do next

Example format:
• Threads outperform single tweets by 1.8 points on average. Your next 3 updates should lead with a thread, not a tweet.
• Hook strength is your weak point (avg 6.1/10 vs 7.8/10 for clarity). Open with a problem or a surprising number, not your feature name.

Keep it under 120 words total. Output plain text only, no JSON.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const insight = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  return NextResponse.json({ insight });
}
