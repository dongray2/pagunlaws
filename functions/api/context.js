import { grokText } from "../lib/grok.js";

export async function onRequestPost({ request, env }) {
  if (!env.XAI_API_KEY) {
    return Response.json(
      { error: "Provide context is not configured yet. The record on this page is still available." },
      { status: 503 },
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Name the law first." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return Response.json({ error: "Name the law first." }, { status: 400 });
  const note = typeof body.modelNote === "string" ? body.modelNote.slice(0, 800) : "";
  const loaded = typeof body.loadedText === "string" ? body.loadedText.slice(0, 4000) : "";

  const input = [
    "Write background for a reader of a Pennsylvania firearms record.",
    "Say why this law was put into effect, who championed it, and what opposition existed.",
    "Write prose only. Do not include a link, a search box, or any instruction to click.",
    "Do not present your prose as the text of a statute. Do not invent a quotation and call it the statute.",
    "If you mention a case or a statute that is not the stored text, keep it in this background.",
    `Law: ${title}`,
    note ? `Scope note, which is not statute text: ${note}` : "",
    loaded ? `Stored text, already on the page, do not rewrite it: ${loaded}` : "The statute text is not loaded on the site.",
  ].filter(Boolean).join("\n\n");

  try {
    const background = await grokText(env.XAI_API_KEY, input);
    if (!background) throw new Error("The model returned no background.");
    return Response.json({ background });
  } catch (error) {
    return Response.json({ error: error.message || "Provide context failed." }, { status: 502 });
  }
}
