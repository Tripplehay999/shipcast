import { supabaseAdmin } from "@/lib/supabase";

export async function logAIUsage({
  clerkUserId,
  endpoint,
  model,
  promptTokens,
  completionTokens,
  durationMs,
  success,
  error,
}: {
  clerkUserId: string;
  endpoint: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs?: number;
  success: boolean;
  error?: string;
}) {
  try {
    await supabaseAdmin.from("ai_generation_logs").insert({
      clerk_user_id: clerkUserId,
      endpoint,
      model,
      prompt_tokens: promptTokens ?? null,
      completion_tokens: completionTokens ?? null,
      total_tokens: promptTokens != null && completionTokens != null
        ? promptTokens + completionTokens
        : null,
      duration_ms: durationMs ?? null,
      success,
      error: error ?? null,
    });
  } catch {
    // Non-fatal: logging failure should never break the main flow
  }
}
