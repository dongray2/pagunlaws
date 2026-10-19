import { publicMoments } from "./review.js";

export async function publishApproved(env, baseRecord, queue) {
  if (!env || !env.GITHUB_TOKEN) {
    return { published: false, reason: "The approved law is on the site. It is not in the git record until a GitHub token is set." };
  }
  const repo = env.GITHUB_REPO || "dongray2/pagunlaws";
  const url = `https://api.github.com/repos/${repo}/contents/data/record.json`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "pagunlaws-review",
  };
  const current = await fetch(url, { headers });
  if (!current.ok) {
    return { published: false, reason: "The approved law is on the site. The git record could not be updated." };
  }
  const meta = await current.json();
  const stored = JSON.parse(decode(meta.content));
  const moments = publicMoments(stored, queue);
  if (moments.length === stored.moments.length) {
    return { published: true, reason: "" };
  }
  const next = { ...stored, moments };
  const put = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Add attorney-approved legislation to the record.",
      content: encode(JSON.stringify(next, null, 2) + "\n"),
      sha: meta.sha,
      branch: "main",
    }),
  });
  if (!put.ok) {
    return { published: false, reason: "The approved law is on the site. The git record could not be updated." };
  }
  return { published: true, reason: "" };
}

function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decode(value) {
  const binary = atob(String(value || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
