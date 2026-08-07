import "server-only";

const attempts = new Map<string, number[]>();
const limits: Record<string, number> = { resume_analysis: 5, document_generation: 10, regeneration: 5 };

export function enforceAiRateLimit(userId: string, operation: keyof typeof limits) {
  const key = `${userId}:${operation}`; const now = Date.now(); const recent = (attempts.get(key) ?? []).filter(time => time > now - 60 * 60 * 1000);
  if (recent.length >= limits[operation]) throw new Error("AI_RATE_LIMIT");
  recent.push(now); attempts.set(key, recent);
}
