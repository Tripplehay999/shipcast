/**
 * Automation Pipeline Endpoint
 *
 * Runs the full pipeline for a commit group:
 *   1. Load commit group + commits
 *   2. Deduplication check
 *   3. Build structured announcement object (AI)
 *   4. Generate platform content from announcement (AI)
 *   5. Score all generated posts (AI)
 *   6. Save everything + update status
 *
 * POST /api/automation/pipeline
 * Body: { commitGroupId: string }
 *
 * Also supports manual updates:
 * Body: { updateId: string }  — runs scoring + announcement extraction on an existing update
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { buildAnnouncementGenerationPrompt, buildReleaseAnnouncementPrompt } from "@/lib/prompts";
import { buildAnnouncement, buildAnnouncementHash } from "@/lib/announcement-builder";
import { scorePosts } from "@/lib/content-scorer";
import { extractJson } from "@/lib/parse-json";
import { logAIUsage } from "@/lib/ai-logger";
import type { GenerateResponse } from "@/lib/types";
import type { AnnouncementObject } from "@/lib/announcement-builder";
import type { BrandVoice } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    commitGroupId?: string;
    updateId?: string;
    skipScoring?: boolean;
  };

  const jobStart = Date.now();

  // ── Fetch user profile ──────────────────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found. Complete onboarding first." }, { status: 400 });
  }

  // ── Route: commit group pipeline ────────────────────────────────────────────
  if (body.commitGroupId) {
    return runCommitGroupPipeline({
      commitGroupId: body.commitGroupId,
      clerkUserId: userId,
      profile,
      skipScoring: body.skipScoring ?? false,
      jobStart,
    });
  }

  // ── Route: manual update scoring ────────────────────────────────────────────
  if (body.updateId) {
    return runUpdatePipeline({
      updateId: body.updateId,
      clerkUserId: userId,
      profile,
      skipScoring: body.skipScoring ?? false,
      jobStart,
    });
  }

  return NextResponse.json({ error: "Provide commitGroupId or updateId" }, { status: 400 });
}

// ─── Commit group pipeline ───────────────────────────────────────────────────

async function runCommitGroupPipeline({
  commitGroupId,
  clerkUserId,
  profile,
  skipScoring,
  jobStart,
}: {
  commitGroupId: string;
  clerkUserId: string;
  profile: Record<string, unknown>;
  skipScoring: boolean;
  jobStart: number;
}) {
  // Load commit group
  const { data: group } = await supabaseAdmin
    .from("commit_groups")
    .select("*")
    .eq("id", commitGroupId)
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!group) return NextResponse.json({ error: "Commit group not found" }, { status: 404 });
  if (group.status === "announced") {
    return NextResponse.json({ error: "Already announced", status: "duplicate" }, { status: 409 });
  }
  if (group.status === "ignored") {
    return NextResponse.json({ error: "Group marked as ignored", status: "ignored" }, { status: 409 });
  }

  // Mark as processing
  await supabaseAdmin
    .from("commit_groups")
    .update({ status: "processing" })
    .eq("id", commitGroupId);

  // Deduplication check
  const deduplication = await checkDuplication(
    clerkUserId,
    profile.product_name as string,
    group.title,
    group.category
  );

  if (deduplication.isDuplicate) {
    await supabaseAdmin
      .from("commit_groups")
      .update({ status: "duplicate" })
      .eq("id", commitGroupId);

    return NextResponse.json({
      status: "skipped",
      reason: "duplicate",
      suggestion: deduplication.newAngleSuggestion,
      existingAnnouncementId: deduplication.existingId,
    });
  }

  // Fetch commit messages
  const commitIds = group.commit_ids as string[];
  const { data: commits } = await supabaseAdmin
    .from("github_commits")
    .select("message, title, commit_type")
    .in("id", commitIds.length > 0 ? commitIds : ["__none__"]);

  const commitMessages = (commits ?? []).map((c) => c.message ?? c.title ?? "").filter(Boolean);

  // ── Step 1: Build structured announcement ──────────────────────────────────
  let announcementObj: AnnouncementObject;
  let announceBuildTokens = { input: 0, output: 0, ms: 0 };

  try {
    const result = await buildAnnouncement({
      commitMessages,
      productName: profile.product_name as string,
      productDescription: profile.product_description as string,
      productLink: profile.product_link as string | undefined,
      audience: profile.target_audience as string | undefined,
      brandVoice: profile.brand_voice as string | undefined,
      category: group.category,
      detectedKeywords: group.detected_keywords ?? [],
      releaseTag: group.source === "release" ? group.title : undefined,
    });

    announcementObj = result.announcement;
    announceBuildTokens = { input: result.inputTokens, output: result.outputTokens, ms: result.durationMs };

    logAIUsage({
      clerkUserId,
      endpoint: "automation/build-announcement",
      model: "claude-sonnet-4-6",
      promptTokens: result.inputTokens,
      completionTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
    });
  } catch (err) {
    await supabaseAdmin.from("commit_groups").update({ status: "pending" }).eq("id", commitGroupId);
    return NextResponse.json({ error: "Announcement extraction failed", detail: String(err) }, { status: 500 });
  }

  // Save announcement to DB
  const deduHash = buildAnnouncementHash(clerkUserId, announcementObj.feature_name, announcementObj.category);

  const { data: savedAnnouncement, error: annErr } = await supabaseAdmin
    .from("announcement_objects")
    .insert({
      clerk_user_id: clerkUserId,
      commit_group_id: commitGroupId,
      product_name: announcementObj.product_name,
      feature_name: announcementObj.feature_name,
      headline: announcementObj.headline,
      summary: announcementObj.summary,
      benefits: announcementObj.benefits,
      story: announcementObj.story,
      cta: announcementObj.cta,
      link: announcementObj.link || profile.product_link || null,
      category: announcementObj.category,
      audience: announcementObj.audience,
      tone_hint: announcementObj.tone_hint,
      source: group.source,
      dedup_hash: deduHash,
      status: "draft",
    })
    .select()
    .single();

  if (annErr || !savedAnnouncement) {
    await supabaseAdmin.from("commit_groups").update({ status: "pending" }).eq("id", commitGroupId);
    return NextResponse.json({ error: "Failed to save announcement" }, { status: 500 });
  }

  // ── Step 2: Generate platform content from announcement ────────────────────
  const brandVoice = (profile.brand_voice as BrandVoice) ?? "casual";
  const examplePosts = (profile.example_posts as string[]) ?? [];

  const prompt = group.source === "release"
    ? buildReleaseAnnouncementPrompt(
        announcementObj,
        group.title,
        commitMessages.filter((m) => m.startsWith("feat")).slice(0, 8),
        brandVoice,
        examplePosts
      )
    : buildAnnouncementGenerationPrompt(announcementObj, brandVoice, examplePosts);

  const t1 = Date.now();
  let generatedContent: GenerateResponse;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    });
    const genMs = Date.now() - t1;

    logAIUsage({
      clerkUserId,
      endpoint: "automation/generate-content",
      model: "claude-sonnet-4-6",
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      durationMs: genMs,
      success: true,
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error("AI returned non-JSON");
    generatedContent = JSON.parse(jsonStr) as GenerateResponse;
  } catch (err) {
    // Mark announcement as draft and return partial result
    return NextResponse.json({
      status: "partial",
      announcementId: savedAnnouncement.id,
      error: "Content generation failed",
      detail: String(err),
    }, { status: 500 });
  }

  // Save as an update + generated_content (links to existing pipeline)
  const { data: update } = await supabaseAdmin
    .from("updates")
    .insert({
      clerk_user_id: clerkUserId,
      raw_update: `[Auto] ${announcementObj.headline}`,
    })
    .select()
    .single();

  if (!update) {
    return NextResponse.json({ error: "Failed to create update record" }, { status: 500 });
  }

  const { data: savedContent } = await supabaseAdmin
    .from("generated_content")
    .insert({
      update_id: update.id,
      tweet: generatedContent.tweet,
      thread: generatedContent.thread,
      linkedin: generatedContent.linkedin,
      reddit: generatedContent.reddit,
      indie_hackers: generatedContent.indie_hackers,
      blog_draft: generatedContent.blog_draft ?? null,
      email_subject: generatedContent.email_subject ?? null,
      email_body: generatedContent.email_body ?? null,
      changelog_entry: generatedContent.changelog_entry ?? null,
    })
    .select()
    .single();

  // Link announcement to update + mark content generated
  await supabaseAdmin
    .from("announcement_objects")
    .update({
      update_id: update.id,
      content_generated: true,
    })
    .eq("id", savedAnnouncement.id);

  // Update commit group → announced
  await supabaseAdmin
    .from("commit_groups")
    .update({ status: "announced", announcement_id: savedAnnouncement.id })
    .eq("id", commitGroupId);

  // ── Step 3: Score content (optional, non-blocking) ─────────────────────────
  let scoreResult = null;

  if (!skipScoring && savedContent) {
    try {
      const postsToScore = [
        { format: "tweet", content: generatedContent.tweet },
        { format: "linkedin", content: generatedContent.linkedin },
        { format: "reddit", content: generatedContent.reddit },
        { format: "indie_hackers", content: generatedContent.indie_hackers },
      ].filter((p) => !!p.content);

      const batch = await scorePosts(postsToScore, {
        headline: announcementObj.headline,
        summary: announcementObj.summary,
        benefits: announcementObj.benefits,
      });

      logAIUsage({
        clerkUserId,
        endpoint: "automation/score-content",
        model: "claude-sonnet-4-6",
        promptTokens: batch.inputTokens,
        completionTokens: batch.outputTokens,
        durationMs: batch.durationMs,
        success: true,
      });

      // Save scores
      if (batch.scores.length > 0) {
        await supabaseAdmin.from("content_scores").insert(
          batch.scores.map((s) => ({
            generated_content_id: savedContent.id,
            announcement_id: savedAnnouncement.id,
            format: s.format,
            score: s.score,
            hook_strength: s.hook_strength,
            clarity: s.clarity,
            benefit_emphasis: s.benefit_emphasis,
            novelty: s.novelty,
            feedback: s.feedback,
            needs_regeneration: s.needs_regeneration,
          }))
        );

        // Update announcement with scores
        await supabaseAdmin
          .from("announcement_objects")
          .update({
            best_tweet_score: batch.scores.find((s) => s.format === "tweet")?.score ?? null,
            best_linkedin_score: batch.scores.find((s) => s.format === "linkedin")?.score ?? null,
            avg_score: batch.avgScore,
          })
          .eq("id", savedAnnouncement.id);
      }

      scoreResult = {
        avgScore: batch.avgScore,
        bestFormat: batch.bestFormat,
        bestScore: batch.bestScore,
        scoresCount: batch.scores.length,
      };
    } catch {
      // Scoring failure should not break the pipeline
    }
  }

  const totalMs = Date.now() - jobStart;

  // Log pipeline job
  void supabaseAdmin.from("pipeline_jobs").insert({
    clerk_user_id: clerkUserId,
    job_type: "full_pipeline",
    source_type: "commit_group",
    source_id: commitGroupId,
    status: "completed",
    input_summary: `${commitMessages.length} commits → ${announcementObj.feature_name}`,
    output_summary: `announcement ${savedAnnouncement.id}, content ${savedContent?.id}`,
    duration_ms: totalMs,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    status: "success",
    commitGroupId,
    announcementId: savedAnnouncement.id,
    updateId: update.id,
    generatedContentId: savedContent?.id ?? null,
    announcement: {
      feature_name: announcementObj.feature_name,
      headline: announcementObj.headline,
      summary: announcementObj.summary,
      benefits: announcementObj.benefits,
    },
    scoring: scoreResult,
    durationMs: totalMs,
  });
}

// ─── Manual update pipeline (scoring + announcement extraction) ───────────────

async function runUpdatePipeline({
  updateId,
  clerkUserId,
  profile,
  skipScoring,
  jobStart,
}: {
  updateId: string;
  clerkUserId: string;
  profile: Record<string, unknown>;
  skipScoring: boolean;
  jobStart: number;
}) {
  // Load update + generated content
  const { data: update } = await supabaseAdmin
    .from("updates")
    .select("*, generated_content(*)")
    .eq("id", updateId)
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!update) return NextResponse.json({ error: "Update not found" }, { status: 404 });

  const gc = Array.isArray(update.generated_content)
    ? update.generated_content[0]
    : update.generated_content;

  if (!gc) {
    return NextResponse.json({ error: "No generated content for this update" }, { status: 400 });
  }

  // Build announcement from the raw update text
  const { announcement: announcementObj, inputTokens, outputTokens, durationMs } = await buildAnnouncement({
    rawUpdate: update.raw_update,
    productName: profile.product_name as string,
    productDescription: profile.product_description as string,
    productLink: profile.product_link as string | undefined,
    brandVoice: profile.brand_voice as string | undefined,
  });

  logAIUsage({
    clerkUserId,
    endpoint: "automation/build-announcement",
    model: "claude-sonnet-4-6",
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    durationMs,
    success: true,
  });

  const deduHash = buildAnnouncementHash(clerkUserId, announcementObj.feature_name, announcementObj.category);

  const { data: savedAnnouncement } = await supabaseAdmin
    .from("announcement_objects")
    .insert({
      clerk_user_id: clerkUserId,
      update_id: updateId,
      product_name: announcementObj.product_name,
      feature_name: announcementObj.feature_name,
      headline: announcementObj.headline,
      summary: announcementObj.summary,
      benefits: announcementObj.benefits,
      story: announcementObj.story,
      cta: announcementObj.cta,
      link: announcementObj.link || profile.product_link || null,
      category: announcementObj.category,
      audience: announcementObj.audience,
      tone_hint: announcementObj.tone_hint,
      source: "manual",
      dedup_hash: deduHash,
      content_generated: true,
      status: "approved",
    })
    .select()
    .single();

  // Score the existing generated content
  let scoreResult = null;
  if (!skipScoring && savedAnnouncement) {
    try {
      const postsToScore = [
        { format: "tweet", content: gc.tweet as string },
        { format: "linkedin", content: gc.linkedin as string },
        { format: "reddit", content: gc.reddit as string },
        { format: "indie_hackers", content: gc.indie_hackers as string },
      ].filter((p) => !!p.content);

      const batch = await scorePosts(postsToScore, {
        headline: announcementObj.headline,
        summary: announcementObj.summary,
        benefits: announcementObj.benefits,
      });

      logAIUsage({
        clerkUserId,
        endpoint: "automation/score-content",
        model: "claude-sonnet-4-6",
        promptTokens: batch.inputTokens,
        completionTokens: batch.outputTokens,
        durationMs: batch.durationMs,
        success: true,
      });

      if (batch.scores.length > 0) {
        await supabaseAdmin.from("content_scores").insert(
          batch.scores.map((s) => ({
            generated_content_id: gc.id,
            announcement_id: savedAnnouncement.id,
            format: s.format,
            score: s.score,
            hook_strength: s.hook_strength,
            clarity: s.clarity,
            benefit_emphasis: s.benefit_emphasis,
            novelty: s.novelty,
            feedback: s.feedback,
            needs_regeneration: s.needs_regeneration,
          }))
        );

        await supabaseAdmin
          .from("announcement_objects")
          .update({
            best_tweet_score: batch.scores.find((s) => s.format === "tweet")?.score ?? null,
            best_linkedin_score: batch.scores.find((s) => s.format === "linkedin")?.score ?? null,
            avg_score: batch.avgScore,
          })
          .eq("id", savedAnnouncement.id);
      }

      scoreResult = { avgScore: batch.avgScore, bestFormat: batch.bestFormat, bestScore: batch.bestScore };
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    status: "success",
    updateId,
    announcementId: savedAnnouncement?.id ?? null,
    announcement: {
      feature_name: announcementObj.feature_name,
      headline: announcementObj.headline,
      summary: announcementObj.summary,
      benefits: announcementObj.benefits,
    },
    scoring: scoreResult,
    durationMs: Date.now() - jobStart,
  });
}

// ─── Deduplication check ─────────────────────────────────────────────────────

async function checkDuplication(
  clerkUserId: string,
  productName: string,
  featureTitle: string,
  category: string
): Promise<{ isDuplicate: boolean; existingId?: string; newAngleSuggestion?: string }> {
  // Check for same feature name announced in the last 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const normalized = featureTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

  const { data: existing } = await supabaseAdmin
    .from("announcement_objects")
    .select("id, feature_name, headline")
    .eq("clerk_user_id", clerkUserId)
    .ilike("feature_name", `%${normalized.split(" ")[0]}%`)
    .gte("created_at", cutoff)
    .not("status", "eq", "rejected")
    .limit(1)
    .single();

  if (!existing) return { isDuplicate: false };

  // Suggest a new angle
  const newAngles = [
    `How we built ${featureTitle} for ${productName} — a technical deep dive`,
    `What we learned shipping ${featureTitle}`,
    `The story behind ${featureTitle}: why we built it differently`,
    `${featureTitle} 2.0: what we improved based on user feedback`,
  ];

  return {
    isDuplicate: true,
    existingId: existing.id,
    newAngleSuggestion: newAngles[Math.floor(Math.random() * newAngles.length)],
  };
}
