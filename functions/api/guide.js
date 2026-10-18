import record from "../../data/record.json" with { type: "json" };
import { sanitizeModelResult } from "../../site/tree.js";
import { grokText, parseJsonObject } from "../lib/grok.js";

export async function onRequestPost({ request, env }) {
  if (!env.XAI_API_KEY) {
    return Response.json(
      { error: "The guide is not configured yet. The record on this page is still available." },
      { status: 503 },
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the text to read." }, { status: 400 });
  }
  const kind = body.kind === "scenario" ? "scenario" : "proposal";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 12000) : "";
  if (!text) return Response.json({ error: "Write something first." }, { status: 400 });

  const catalog = record.moments.map((moment) => ({
    id: moment.id,
    title: moment.title,
    walks: moment.walks,
    note: moment.modelNote,
  }));
  const task = kind === "scenario"
    ? "The reader described a scenario. Return moments potentially in play. Separate The shooting, The weapon, The manner, and The place only when the story contains that fact. Do not declare the shooting justified. Do not declare an offense committed."
    : "The reader pasted proposed legislation. Return the existing moments the text runs into, under the heading Runs into. Do not say the proposal is void.";

  const input = [
    "You guide a reader through a stored Pennsylvania firearms record.",
    "Use only ids from the catalog. If a law is not in the catalog, put its name in outside. Do not write statute text.",
    "Notes in the catalog are not statute text and must not be quoted as statute.",
    task,
    "Reply with one JSON object and nothing else:",
    '{"momentIds":[],"outside":[{"name":"","why":""}],"guide":[{"heading":"","momentIds":[],"prose":""}]}',
    "Allowed headings: The shooting, The weapon, The manner, The place, Runs into.",
    `Catalog: ${JSON.stringify(catalog)}`,
    `Reader text: ${text}`,
  ].join("\n\n");

  try {
    const raw = parseJsonObject(await grokText(env.XAI_API_KEY, input));
    return Response.json(sanitizeModelResult(record, raw));
  } catch (error) {
    return Response.json({ error: error.message || "The guide failed." }, { status: 502 });
  }
}
