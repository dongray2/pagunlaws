import { authorize, json } from "../../lib/http.js";
import { publishApproved } from "../../lib/publish.js";
import { decide } from "../../lib/review.js";
import { loadQueue, saveQueue } from "../../lib/queue-store.js";
import record from "../../record.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;
  const queue = await loadQueue(env);
  if (!queue) return json({ error: "The review queue is not configured yet." }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send the decision." }, 400);
  }
  const type = body.action === "approve" || body.action === "reject" || body.action === "edit" ? body.action : "";
  if (!type || typeof body.id !== "string") return json({ error: "Choose approve, edit, or reject." }, 400);
  try {
    const result = decide(queue, record, {
      id: body.id,
      type,
      edits: body.edits,
      attest: body.attest,
      at: new Date().toISOString(),
    });
    await saveQueue(env, result.queue);
    let git = { published: false, reason: "" };
    if (type === "approve") git = await publishApproved(env, record, result.queue);
    return json({
      pending: result.queue.items.length,
      moment: result.moment,
      git: git.reason,
    });
  } catch (error) {
    const status = /cannot be edited|not waiting|Choose approve/.test(error.message) ? 400 : 500;
    return json({ error: error.message }, status);
  }
}
