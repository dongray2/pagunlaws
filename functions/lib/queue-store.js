import { emptyQueue, normalizeQueue } from "./review.js";

function reviewStore(env) {
  if (!env) return null;
  return env.REVIEW || env.RE || null;
}

export async function loadQueue(env) {
  const store = reviewStore(env);
  if (!store) return null;
  const raw = await store.get("queue", "json");
  return normalizeQueue(raw || emptyQueue());
}

export async function saveQueue(env, queue) {
  const store = reviewStore(env);
  if (!store) throw new Error("The review queue is not configured yet.");
  await store.put("queue", JSON.stringify(normalizeQueue(queue)));
}
