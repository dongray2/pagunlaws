import { scoutFurther } from "../../lib/discover.js";
import { authorize, json } from "../../lib/http.js";
import { RUN_LIMIT } from "../../lib/review.js";
import { loadQueue, saveQueue } from "../../lib/queue-store.js";
import record from "../../record.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;
  if (!env.XAI_API_KEY) return json({ error: "The review model is not configured yet." }, 503);
  const queue = await loadQueue(env);
  if (!queue) return json({ error: "The review queue is not configured yet." }, 503);
  if (queue.items.length === 0) {
    return json({ error: "List the Chapter 61 acts before looking for other acts." }, 409);
  }
  if (queue.further === "done" || queue.items.length >= RUN_LIMIT) {
    queue.further = "done";
    await saveQueue(env, queue);
    return json({ added: 0, further: "done", identified: waiting(queue) });
  }
  try {
    const more = await scoutFurther(env.XAI_API_KEY, record, queue);
    const filled = more.added === 0 || more.queue.items.length >= RUN_LIMIT;
    more.queue.further = filled ? "done" : "pending";
    await saveQueue(env, more.queue);
    return json({
      added: more.added,
      further: more.queue.further,
      identified: waiting(more.queue),
    });
  } catch (error) {
    return json({ error: error.message || "The search failed." }, 502);
  }
}

function waiting(queue) {
  return queue.items.filter((item) => item.reviewStatus === "identified" || item.reviewStatus === "researching").length;
}
