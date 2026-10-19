import { scout } from "../../lib/discover.js";
import { authorize, json } from "../../lib/http.js";
import { REVIEW_FIRST, canStartRun } from "../../lib/review.js";
import { loadQueue, saveQueue } from "../../lib/queue-store.js";
import record from "../../record.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;
  if (!env.XAI_API_KEY) return json({ error: "The review model is not configured yet." }, 503);
  const queue = await loadQueue(env);
  if (!queue) return json({ error: "The review queue is not configured yet." }, 503);
  if (!canStartRun(queue)) return json({ error: REVIEW_FIRST }, 409);
  try {
    const found = await scout(env.XAI_API_KEY, record, queue);
    await saveQueue(env, found.queue);
    return json({
      added: found.added,
      identified: found.queue.items.length,
      canStart: canStartRun(found.queue),
    });
  } catch (error) {
    return json({ error: error.message || "The search failed." }, 502);
  }
}
