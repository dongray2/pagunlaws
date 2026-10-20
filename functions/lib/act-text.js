const ACT_PAGE = /^Act of [A-Za-z.]+\s+\d{1,2},\s+(\d{4})(?:,\s*(\d+)(?:st|nd|rd|th)\s+Sp\.?\s*Sess\.?)?,\s*P\.L\.\s*\d+,\s*No\.\s*(\d+)\b/;

export function actTextUrl(citation) {
  const match = String(citation || "").match(ACT_PAGE);
  if (!match) return "";
  const session = match[2] ? String(Number(match[2])) : "0";
  return `https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?iFrame=true&txtType=HTM&SessYr=${match[1]}&SessInd=${session}&ActNum=${Number(match[3])}`;
}

export function actBody(html) {
  const text = visibleText(html);
  if (!text) return "";
  if (/No Act found for the selected year/i.test(text)) return "";
  if (!/hereby enacts|be it enacted/i.test(text)) return "";
  return text;
}

export function clipActText(text) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (source.length <= 28000) return source;
  const parts = [source.slice(0, 6000)];
  const needle = /firearm|6\d{3}|dangerous articles/gi;
  let match;
  let windows = 0;
  while ((match = needle.exec(source)) && windows < 6) {
    const start = Math.max(0, match.index - 300);
    parts.push(source.slice(start, match.index + 1400));
    windows += 1;
    const resume = match.index + 1400;
    if (needle.lastIndex < resume) needle.lastIndex = resume;
  }
  parts.push(source.slice(-8000));
  return parts.join("\n\n[...]\n\n");
}

function visibleText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&#167;|&#x0*A7;/gi, "§")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
