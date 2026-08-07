import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModelMetadata } from "./types";

export async function recordAiUsage(userId: string, operation: string, metadata: ModelMetadata) {
  await createAdminClient().from("ai_usage").insert({ user_id: userId, operation, model: metadata.model, input_tokens: metadata.inputTokens, output_tokens: metadata.outputTokens, estimated_cost: 0 });
}
