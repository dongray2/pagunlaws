import { authorize, json } from "../../lib/http.js";
import { canStartRun } from "../../lib/review.js";
import { loadQueue } from "../../lib/queue-store.js";

export async function onRequestGet({ request, env }) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;
  const queue = await loadQueue(env);
  if (!queue) return json({ error: "The review queue is not configured yet." }, 503);
  const identified = queue.items.filter((item) => item.reviewStatus === "identified" || item.reviewStatus === "researching").length;
  return json({
    canStart: canStartRun(queue),
    further: queue.further,
    identified,
    pending: queue.items.length - identified,
    rejected: queue.rejected.length,
    approved: queue.approved.length,
    items: queue.items,
  });
}
