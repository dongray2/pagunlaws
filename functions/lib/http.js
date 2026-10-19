export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function authorize(request, env) {
  if (!env || !env.ADMIN_TOKEN) {
    return { ok: false, response: json({ error: "Review is not configured yet." }, 503) };
  }
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!same(token, env.ADMIN_TOKEN)) {
    return { ok: false, response: json({ error: "This review is for a Pennsylvania-licensed attorney." }, 401) };
  }
  return { ok: true };
}

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
