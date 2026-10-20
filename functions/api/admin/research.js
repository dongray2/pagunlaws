import { researchItem } from "../../lib/discover.js";
import { authorize, json } from "../../lib/http.js";
import { loadQueue, saveQueue } from "../../lib/queue-store.js";
import record from "../../record.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;
  if (!env.XAI_API_KEY) return json({ error: "The review model is not configured yet." }, 503);
  const queue = await loadQueue(env);
  if (!queue) return json({ error: "The review queue is not configured yet." }, 503);
  const requestedId = await requestedItemId(request);
  let index = -1;
  if (requestedId) {
    index = queue.items.findIndex((item) => item.id === requestedId);
    if (index < 0) return json({ error: "That item is not waiting for review." }, 404);
  } else {
    index = queue.items.findIndex((item) => item.reviewStatus === "identified" || item.reviewStatus === "researching");
    if (index < 0) return json({ remaining: 0, item: null });
  }
  const current = queue.items[index];
  current.reviewStatus = "researching";
  await saveQueue(env, queue);
  try {
    queue.items[index] = await researchItem(env.XAI_API_KEY, record, current);
  } catch (error) {
    queue.items[index] = {
      ...current,
      reviewStatus: "pending",
      researchError: error.message || "The research failed.",
    };
  }
  await saveQueue(env, queue);
  const remaining = queue.items.filter((item) => item.reviewStatus === "identified" || item.reviewStatus === "researching").length;
  return json({ remaining, item: queue.items[index] });
}

async function requestedItemId(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) return "";
  try {
    const body = await request.json();
    return body && typeof body.id === "string" ? body.id : "";
  } catch {
    return "";
  }
}
