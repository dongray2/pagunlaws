export const RUN_LIMIT = 100;

export const REVIEW_FIRST =
  "A new run cannot be completed while legislation is still waiting. Approve, edit, or reject each item first. Unapproved legislation is not on the public record.";

export const UNREAD_DATE = "The effective date has not been read. Do not quote a date.";

const OFFICIAL_HOSTS = [
  "legis.state.pa.us",
  "palegis.us",
  "pacourts.us",
  "pacodeandbulletin.gov",
  "govinfo.gov",
  "uscode.house.gov",
  "supreme.court.gov",
  "congress.gov",
];

const STATUSES = new Set(["in_force", "superseded", "not_yet_checked", "limited_by_court"]);

export function emptyQueue() {
  return { items: [], rejected: [], approved: [] };
}

export function normalizeQueue(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    items: Array.isArray(source.items) ? source.items : [],
    rejected: Array.isArray(source.rejected) ? source.rejected : [],
    approved: Array.isArray(source.approved) ? source.approved : [],
  };
}

export function canStartRun(queue) {
  return normalizeQueue(queue).items.length === 0;
}

export function officialUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return OFFICIAL_HOSTS.some((name) => host === name || host.endsWith(`.${name}`));
  } catch {
    return false;
  }
}

export function identityKey(item) {
  const citation = oneLine(item && item.citation).toLowerCase();
  if (citation) return `c:${citation}`;
  return `t:${oneLine(item && item.title).toLowerCase()}`;
}

export function knownKeys(record, queue) {
  const keys = new Set();
  const add = (item) => {
    const key = identityKey(item);
    if (key !== "t:") keys.add(key);
  };
  for (const moment of (record && record.moments) || []) add(moment);
  const box = normalizeQueue(queue);
  for (const item of box.items) add(item);
  for (const item of box.rejected) add(item);
  for (const item of box.approved) add(item);
  return keys;
}

export function publicMoments(record, queue) {
  const seen = new Set();
  const moments = [];
  for (const moment of (record && record.moments) || []) {
    if (!moment || seen.has(moment.id)) continue;
    seen.add(moment.id);
    moments.push(moment);
  }
  for (const moment of normalizeQueue(queue).approved) {
    if (!moment || seen.has(moment.id)) continue;
    seen.add(moment.id);
    moments.push(moment);
  }
  return moments;
}

export function addCandidates(queue, record, candidates) {
  const next = normalizeQueue(queue);
  const keys = knownKeys(record, next);
  const used = new Set([
    ...((record && record.moments) || []).map((moment) => moment.id),
    ...next.items.map((item) => item.id),
    ...next.approved.map((moment) => moment.id),
  ]);
  let added = 0;
  for (const candidate of candidates || []) {
    if (next.items.length >= RUN_LIMIT) break;
    const title = oneLine(candidate && candidate.title).slice(0, 300);
    if (!title) continue;
    const citation = oneLine(candidate && candidate.citation).slice(0, 300);
    const key = identityKey({ title, citation });
    if (keys.has(key)) continue;
    keys.add(key);
    const id = makeId(title, used);
    next.items.push({
      id,
      title,
      citation,
      why: clip(candidate && candidate.why, 500),
      reviewStatus: "identified",
      titleVerified: false,
      text: "",
      textVerified: false,
      citationVerified: false,
      sourceUrl: officialUrl(candidate && candidate.sourceUrl) ? candidate.sourceUrl.trim() : "",
      effectiveStatement: UNREAD_DATE,
      dateKind: "unchecked",
      dateVerified: false,
      sort: "",
      whatChanged: "",
      lane: "",
      walks: [],
      status: "not_yet_checked",
      notes: "",
      researchError: "",
    });
    added += 1;
  }
  return { queue: next, added };
}

export function sanitizeFinding(raw, record) {
  const finding = raw && typeof raw === "object" ? raw : {};
  const url = clip(finding.sourceUrl, 500);
  const official = officialUrl(url);
  const title = oneLine(finding.title).slice(0, 300);
  const citation = oneLine(finding.citation).slice(0, 300);
  const text = official ? clip(finding.text, 20000) : "";
  let dateKind = finding.dateKind === "effective" || finding.dateKind === "approval" ? finding.dateKind : "unchecked";
  let sort = /^\d{4}$/.test(clean(finding.sort)) ? clean(finding.sort) : "";
  let statement = clip(finding.effectiveStatement, 1000);
  let dateVerified = official && finding.dateVerified === true && dateKind !== "unchecked" && sort !== "" && statement !== "";
  if (!dateVerified) {
    dateKind = "unchecked";
    sort = "";
    statement = UNREAD_DATE;
  }
  const lanes = new Set(((record && record.lanes) || []).map((lane) => lane.id));
  const topics = new Set(((record && record.topics) || []).map((topic) => topic.id).filter((id) => id !== "all"));
  const lane = lanes.has(finding.lane) ? finding.lane : "";
  const walks = [];
  for (const id of Array.isArray(finding.walks) ? finding.walks : []) {
    if (topics.has(id) && !walks.includes(id)) walks.push(id);
  }
  const status = STATUSES.has(finding.status) ? finding.status : "not_yet_checked";
  return {
    title,
    titleVerified: official && finding.titleVerified === true && title !== "",
    citation,
    citationVerified: official && finding.citationVerified === true && citation !== "",
    text,
    textVerified: official && finding.textVerified === true && text !== "",
    sourceUrl: url,
    effectiveStatement: statement,
    dateKind,
    dateVerified,
    sort,
    whatChanged: clip(finding.whatChanged, 1000),
    lane,
    walks,
    status,
    notes: clip(finding.notes, 1000),
    researchError: "",
  };
}

export function applyFinding(item, raw, record) {
  const clean = sanitizeFinding(raw, record);
  return {
    ...item,
    ...clean,
    id: item.id,
    title: clean.title || item.title,
    titleVerified: clean.title ? clean.titleVerified : false,
    reviewStatus: "pending",
  };
}

export function applyEdits(item, edits) {
  const next = { ...item, walks: item.walks.slice() };
  const incoming = edits && typeof edits === "object" ? edits : {};
  const locks = [
    ["title", "titleVerified"],
    ["citation", "citationVerified"],
    ["text", "textVerified"],
    ["effectiveStatement", "dateVerified"],
    ["dateKind", "dateVerified"],
    ["sort", "dateVerified"],
    ["sourceUrl", "sourceLocked"],
  ];
  const sourceLocked = item.textVerified || item.citationVerified || item.dateVerified;
  for (const [field, flag] of locks) {
    if (!Object.prototype.hasOwnProperty.call(incoming, field)) continue;
    const locked = flag === "sourceLocked" ? sourceLocked : item[flag] === true;
    if (locked && clean(incoming[field]) !== clean(item[field])) {
      throw new Error("That field was verified and cannot be edited.");
    }
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "title") && !item.titleVerified) next.title = oneLine(incoming.title).slice(0, 300);
  if (Object.prototype.hasOwnProperty.call(incoming, "citation") && !item.citationVerified) next.citation = oneLine(incoming.citation).slice(0, 300);
  if (Object.prototype.hasOwnProperty.call(incoming, "text") && !item.textVerified) next.text = clip(incoming.text, 20000);
  if (!item.dateVerified) {
    if (Object.prototype.hasOwnProperty.call(incoming, "effectiveStatement")) next.effectiveStatement = clip(incoming.effectiveStatement, 1000);
    if (incoming.dateKind === "effective" || incoming.dateKind === "approval" || incoming.dateKind === "unchecked") {
      next.dateKind = incoming.dateKind;
    }
    if (Object.prototype.hasOwnProperty.call(incoming, "sort")) {
      const sort = clean(incoming.sort);
      next.sort = /^\d{4}$/.test(sort) ? sort : "";
    }
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "whatChanged")) next.whatChanged = clip(incoming.whatChanged, 1000);
  if (Object.prototype.hasOwnProperty.call(incoming, "notes")) next.notes = clip(incoming.notes, 1000);
  if (typeof incoming.lane === "string") next.lane = incoming.lane;
  if (Array.isArray(incoming.walks)) next.walks = incoming.walks.map((id) => clean(id)).filter(Boolean);
  if (STATUSES.has(incoming.status)) next.status = incoming.status;
  return next;
}

export function applyAttest(item, attest) {
  const next = { ...item };
  const flags = attest && typeof attest === "object" ? attest : {};
  if (flags.title && !next.titleVerified && clean(next.title)) next.titleVerified = true;
  if (flags.citation && !next.citationVerified && clean(next.citation)) next.citationVerified = true;
  if (flags.text && !next.textVerified && clean(next.text)) next.textVerified = true;
  if (flags.date && !next.dateVerified && clean(next.effectiveStatement) && next.effectiveStatement !== UNREAD_DATE && (next.dateKind === "effective" || next.dateKind === "approval") && /^\d{4}$/.test(next.sort)) {
    next.dateVerified = true;
  }
  return next;
}

export function toMoment(item, record) {
  const lanes = new Set(((record && record.lanes) || []).map((lane) => lane.id));
  const topics = new Set(((record && record.topics) || []).map((topic) => topic.id).filter((id) => id !== "all"));
  const dateOk = item.dateVerified === true && (item.dateKind === "effective" || item.dateKind === "approval") && /^\d{4}$/.test(item.sort || "");
  const textOk = item.textVerified === true && clean(item.text) !== "";
  const citationOk = item.citationVerified === true && clean(item.citation) !== "";
  const checked = dateOk && textOk && citationOk;
  const walks = [];
  for (const id of item.walks || []) {
    if (topics.has(id) && !walks.includes(id)) walks.push(id);
  }
  let status = "not_yet_checked";
  if (checked && item.status && item.status !== "not_yet_checked" && STATUSES.has(item.status)) status = item.status;
  if (checked && status === "not_yet_checked") status = "in_force";
  return {
    id: item.id,
    sort: dateOk ? item.sort : "9999",
    dateKind: dateOk ? item.dateKind : "unchecked",
    lane: lanes.has(item.lane) ? item.lane : ((record.lanes && record.lanes[0] && record.lanes[0].id) || "right"),
    title: clean(item.title) || "Untitled",
    status,
    citation: citationOk ? clean(item.citation) : null,
    effectiveStatement: dateOk ? clean(item.effectiveStatement) : UNREAD_DATE,
    whatChanged: clean(item.whatChanged) || null,
    text: textOk ? item.text : null,
    textState: textOk ? "loaded" : "not_loaded",
    walks,
    modelNote: "Added after attorney review. This note is not statute text.",
  };
}

export function decide(queue, record, action) {
  const next = normalizeQueue(JSON.parse(JSON.stringify(queue)));
  const index = next.items.findIndex((item) => item.id === action.id);
  if (index < 0) throw new Error("That item is not waiting for review.");
  let item = next.items[index];
  if (action.edits) item = applyEdits(item, action.edits);
  if (action.attest) item = applyAttest(item, action.attest);
  if (action.type === "edit") {
    next.items[index] = item;
    return { queue: next, moment: null };
  }
  if (action.type === "reject") {
    next.rejected.push({
      id: item.id,
      title: item.title,
      citation: item.citation || "",
      key: identityKey(item),
      at: action.at || "",
    });
    next.items.splice(index, 1);
    return { queue: next, moment: null };
  }
  if (action.type === "approve") {
    const moment = toMoment(item, record);
    next.approved.push(moment);
    next.items.splice(index, 1);
    return { queue: next, moment };
  }
  throw new Error("Choose approve, edit, or reject.");
}

function oneLine(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function clean(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function clip(value, max) {
  return clean(value).slice(0, max);
}

function makeId(title, used) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "law";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}
