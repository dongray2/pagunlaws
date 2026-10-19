import record from "../record.js";
import { json } from "../lib/http.js";
import { publicMoments } from "../lib/review.js";
import { loadQueue } from "../lib/queue-store.js";

export async function onRequestGet({ env }) {
  let moments = record.moments;
  try {
    const queue = await loadQueue(env);
    if (queue) moments = publicMoments(record, queue);
  } catch {
    moments = record.moments;
  }
  return json({ ...record, moments });
}
