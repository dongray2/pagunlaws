import { emptyQueue, normalizeQueue } from "./review.js";

export async function loadQueue(env) {
  if (!env || !env.REVIEW) return null;
  const raw = await env.REVIEW.get("queue", "json");
  return normalizeQueue(raw || emptyQueue());
}

export async function saveQueue(env, queue) {
  await env.REVIEW.put("queue", JSON.stringify(normalizeQueue(queue)));
}
