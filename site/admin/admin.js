const TOKEN_KEY = "pagunlaws-review";
const BLOCKED = "A new run cannot be completed while legislation is still waiting. Approve, edit, or reject each item first. Unapproved legislation is not on the public record.";

const STATUSES = [
  { value: "in_force", label: "In force" },
  { value: "superseded", label: "Superseded" },
  { value: "not_yet_checked", label: "Not yet checked" },
  { value: "limited_by_court", label: "Limited by a court" },
];

const DATE_KINDS = [
  { value: "unchecked", label: "Not checked" },
  { value: "effective", label: "Effective date" },
  { value: "approval", label: "Approval date, not the day it began to bind" },
];

const gate = document.querySelector("#gate");
const gateError = document.querySelector("#gate-error");
const desk = document.querySelector("#desk");
const statusEl = document.querySelector("#status");
const start = document.querySelector("#start");
const pause = document.querySelector("#pause");
const itemsEl = document.querySelector("#items");

let catalog = { topics: [], lanes: [] };
let catalogReady = false;
let snapshot = null;
let running = false;
let stopAfterThis = false;
let notice = "";

gate.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = document.querySelector("#token").value;
  if (!token) {
    gateError.textContent = "Enter the review key.";
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  document.querySelector("#token").value = "";
  gateError.textContent = "";
  try {
    await openDesk();
  } catch (error) {
    gateError.textContent = error.message;
  }
});

start.addEventListener("click", async () => {
  if (running) return;
  start.disabled = true;
  notice = "";
  try {
    if (snapshot && snapshot.identified > 0) {
      await researchUntilPaused();
      return;
    }
    if (!snapshot || !snapshot.canStart) {
      paintStatus();
      return;
    }
    const result = await api("/api/admin/run", { method: "POST" });
    if (!result.added) {
      notice = "No new legislation was found. The public record is unchanged.";
      await refresh();
      return;
    }
    notice = `Found ${result.added}. Researching one at a time. Nothing is public until you approve it.`;
    statusEl.textContent = notice;
    await researchUntilPaused();
  } catch (error) {
    notice = error.message;
    try {
      await refresh();
    } catch {
      // A rejected key returns to the gate.
    }
    if (desk.hidden) return;
    statusEl.textContent = notice;
  }
});

pause.addEventListener("click", () => {
  stopAfterThis = true;
  pause.disabled = true;
  pause.textContent = "Pausing after this one";
});

if (sessionStorage.getItem(TOKEN_KEY)) {
  openDesk().catch((error) => {
    gateError.textContent = error.message;
  });
}

async function openDesk() {
  await loadCatalog();
  await refresh();
  gate.hidden = true;
  desk.hidden = false;
}

async function loadCatalog() {
  catalogReady = false;
  try {
    const response = await fetch("/api/record");
    const record = response.ok ? await response.json() : await (await fetch("/record.json")).json();
    catalog = {
      topics: Array.isArray(record.topics) ? record.topics : [],
      lanes: Array.isArray(record.lanes) ? record.lanes : [],
    };
    catalogReady = catalog.topics.length > 0 && catalog.lanes.length > 0;
  } catch {
    catalog = { topics: [], lanes: [] };
  }
}

async function refresh() {
  snapshot = await api("/api/admin/queue");
  paintStatus();
  paintItems();
}

function paintStatus() {
  const queue = snapshot;
  if (!queue || running) return;
  if (queue.items.length === 0) {
    const ready = "Nothing is waiting. You can look for up to 100 pieces of legislation that are not already in the record.";
    statusEl.textContent = notice ? `${notice} ${ready}` : ready;
    start.hidden = false;
    start.textContent = "Find legislation";
    start.disabled = false;
    return;
  }
  const parts = [];
  if (queue.pending) parts.push(`${queue.pending} waiting for review`);
  if (queue.identified) parts.push(`${queue.identified} not researched yet`);
  parts.push("Unapproved legislation is not on the public record.");
  if (!queue.canStart) parts.push(BLOCKED);
  if (notice) parts.push(notice);
  statusEl.textContent = parts.join(" ");
  if (queue.identified > 0) {
    start.hidden = false;
    start.textContent = "Continue research";
    start.disabled = false;
  } else {
    start.hidden = true;
    start.disabled = true;
  }
}

async function researchUntilPaused() {
  if (running) return;
  running = true;
  stopAfterThis = false;
  start.disabled = true;
  pause.hidden = false;
  pause.disabled = false;
  pause.textContent = "Pause after this one";
  let failure = "";
  let unfinished = false;
  try {
    while (!stopAfterThis) {
      const result = await api("/api/admin/research", { method: "POST" });
      unfinished = result.remaining > 0;
      if (!result.item || result.remaining === 0) break;
      statusEl.textContent = `Researching. ${result.remaining} still to research. Nothing here is on the public record.`;
    }
    if (stopAfterThis && unfinished) notice = "Paused. Finish the items that are ready, then continue research. Another run waits until the queue is empty.";
    else notice = "Research finished. Approve, edit, or reject each waiting item. Nothing is on the public record until you approve it.";
  } catch (error) {
    failure = error.message;
  } finally {
    running = false;
    pause.hidden = true;
    try {
      await refresh();
    } catch (error) {
      failure = failure || error.message;
    }
    if (failure && !desk.hidden) statusEl.textContent = failure;
  }
}

function paintItems() {
  itemsEl.replaceChildren();
  const queue = snapshot;
  if (!queue || queue.items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "The queue is empty. The public record has no unapproved legislation from this review.";
    itemsEl.append(empty);
    return;
  }
  for (const item of queue.items) itemsEl.append(renderItem(item));
}

function renderItem(item) {
  const card = document.createElement("article");
  card.className = "item";
  const title = document.createElement("h2");
  title.textContent = item.title || "Untitled";
  card.append(title);
  const state = document.createElement("p");
  state.className = "lock";
  state.textContent = item.reviewStatus === "pending"
    ? "Waiting for your review. Not on the public record."
    : "Found, not researched. Not on the public record.";
  card.append(state);
  if (item.why) {
    const why = document.createElement("p");
    why.textContent = item.why;
    card.append(why);
  }
  if (item.researchError) {
    const problem = document.createElement("p");
    problem.className = "review-error";
    problem.textContent = item.researchError;
    card.append(problem);
  }
  if (item.reviewStatus !== "pending") {
    const errorEl = messageLine();
    const reject = button("Reject", "button", "quiet");
    reject.addEventListener("click", () => sendDecision(item, "reject", null, errorEl));
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(reject);
    card.append(actions, errorEl);
    return card;
  }
  const form = document.createElement("form");
  const checks = document.createElement("div");
  checks.className = "checks";
  const errorEl = messageLine();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendDecision(item, "edit", form, errorEl);
  });
  addField(form, "Title", item.titleVerified, item.title, () => textInput("title", item.title));
  if (!item.titleVerified) attest(checks, "title", "I checked the title against the official source");
  addField(form, "Citation", item.citationVerified, item.citation, () => textInput("citation", item.citation));
  if (!item.citationVerified) attest(checks, "citation", "I checked the citation against the official source");
  addField(form, "Text", item.textVerified, item.text, () => area("text", item.text));
  if (!item.textVerified) attest(checks, "text", "I checked the text against the official source");
  const sourceLocked = item.textVerified || item.citationVerified || item.dateVerified;
  addField(form, "Official source", sourceLocked, item.sourceUrl, () => textInput("sourceUrl", item.sourceUrl), item.sourceUrl);
  if (item.dateVerified) {
    const kind = DATE_KINDS.find((entry) => entry.value === item.dateKind);
    locked(form, "Date", [item.effectiveStatement, kind ? kind.label : item.dateKind, item.sort].filter(Boolean).join("\n"));
  } else {
    labeled(form, "Effective-date clause", area("effectiveStatement", item.effectiveStatement));
    labeled(form, "Date kind", selectBox("dateKind", DATE_KINDS, item.dateKind || "unchecked"));
    labeled(form, "Year for ordering", textInput("sort", item.sort));
    attest(checks, "date", "I checked the effective-date clause against the official source");
  }
  labeled(form, "What changed", area("whatChanged", item.whatChanged));
  labeled(form, "Lane", selectBox("lane", laneOptions(item.lane), item.lane || ""));
  const walkLabel = document.createElement("p");
  walkLabel.className = "lock";
  walkLabel.textContent = "Walks";
  form.append(walkLabel, walkBoxes(item.walks || []));
  labeled(form, "Status", selectBox("status", STATUSES, item.status || "not_yet_checked"));
  labeled(form, "Notes", area("notes", item.notes));
  if (checks.childElementCount) form.append(checks);
  if (!catalogReady) {
    const closed = document.createElement("p");
    closed.className = "review-error";
    closed.textContent = "The topic list did not load, so approval is closed. You can still reject this item.";
    form.append(closed);
  }
  const actions = document.createElement("div");
  actions.className = "item-actions";
  const save = button("Save edits", "submit", "");
  const approve = button("Approve", "button", "");
  const reject = button("Reject", "button", "quiet");
  approve.addEventListener("click", () => sendDecision(item, "approve", form, errorEl));
  reject.addEventListener("click", () => sendDecision(item, "reject", form, errorEl));
  if (!catalogReady) {
    save.disabled = true;
    approve.disabled = true;
  }
  actions.append(save, approve, reject);
  form.append(actions, errorEl);
  card.append(form);
  return card;
}

function messageLine() {
  const line = document.createElement("p");
  line.className = "review-error decision-error";
  line.setAttribute("role", "status");
  return line;
}

async function sendDecision(item, action, form, errorEl) {
  if (running) return;
  if (errorEl) errorEl.textContent = "";
  if (action === "reject") {
    const ok = window.confirm("Reject this item? It stays off the public record and will not be proposed again.");
    if (!ok) return;
  }
  const card = errorEl && errorEl.closest("article");
  const buttons = card ? [...card.querySelectorAll("button")] : [];
  for (const node of buttons) node.disabled = true;
  try {
    const body = { id: item.id, action };
    if (action !== "reject") {
      body.edits = editsFrom(form, item);
      body.attest = attestFrom(form);
    }
    const payload = await api("/api/admin/decision", {
      method: "POST",
      body: JSON.stringify(body),
    });
    notice = "";
    if (action === "edit") notice = "Edits saved. This item stays off the public record until you approve or reject it.";
    if (action === "approve") {
      const moment = payload.moment;
      const quoteable = moment && moment.dateKind !== "unchecked" && moment.text && moment.citation;
      notice = quoteable
        ? "Approved. The checked text can appear on the public record."
        : "Approved. The date or text was not verified, so the public record will not quote it as fact.";
      if (payload.git) notice = `${notice} ${payload.git}`;
    }
    if (action === "reject") notice = "Rejected. It is not on the public record.";
    await refresh();
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message;
    for (const node of buttons) node.disabled = false;
  }
}

function editsFrom(form, item) {
  const edits = {
    whatChanged: value(form, "whatChanged"),
    notes: value(form, "notes"),
    lane: value(form, "lane"),
    status: value(form, "status"),
    walks: [...form.querySelectorAll('input[name="walks"]:checked')].map((node) => node.value),
  };
  if (!item.titleVerified) edits.title = value(form, "title");
  if (!item.citationVerified) edits.citation = value(form, "citation");
  if (!item.textVerified) edits.text = value(form, "text");
  const sourceLocked = item.textVerified || item.citationVerified || item.dateVerified;
  if (!sourceLocked) edits.sourceUrl = value(form, "sourceUrl");
  if (!item.dateVerified) {
    edits.effectiveStatement = value(form, "effectiveStatement");
    edits.dateKind = value(form, "dateKind");
    edits.sort = value(form, "sort");
  }
  return edits;
}

function attestFrom(form) {
  const attestFlags = {};
  for (const name of ["title", "citation", "text", "date"]) {
    const box = form.elements[`attest-${name}`];
    if (box) attestFlags[name] = box.checked;
  }
  return attestFlags;
}

function value(form, name) {
  const node = form.elements[name];
  return node ? node.value : "";
}

function addField(parent, label, lockedField, text, editor, link) {
  if (lockedField) locked(parent, label, text, link);
  else labeled(parent, label, editor());
}

function locked(parent, label, text, link) {
  const name = document.createElement("p");
  name.className = "lock";
  name.textContent = label;
  const body = document.createElement("p");
  body.className = "verified";
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = link;
    body.append(anchor);
  } else {
    body.textContent = text || "";
  }
  const note = document.createElement("p");
  note.className = "lock";
  note.textContent = "Verified against the official source. This cannot be edited.";
  parent.append(name, body, note);
}

function labeled(parent, label, control) {
  control.id = `field-${labeled.nextId}`;
  labeled.nextId += 1;
  const name = document.createElement("label");
  name.htmlFor = control.id;
  name.textContent = label;
  parent.append(name, control);
}

labeled.nextId = 1;

function attest(box, name, label) {
  const wrap = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = `attest-${name}`;
  wrap.append(input, document.createTextNode(` ${label}`));
  box.append(wrap);
}

function textInput(name, text) {
  const node = document.createElement("input");
  node.name = name;
  node.value = text || "";
  return node;
}

function area(name, text) {
  const node = document.createElement("textarea");
  node.name = name;
  node.value = text || "";
  return node;
}

function selectBox(name, options, selected) {
  const node = document.createElement("select");
  node.name = name;
  for (const option of options) {
    const entry = document.createElement("option");
    entry.value = option.value;
    entry.textContent = option.label;
    if (option.value === selected) entry.selected = true;
    node.append(entry);
  }
  return node;
}

function button(text, type, className) {
  const node = document.createElement("button");
  node.type = type;
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function laneOptions(current) {
  const options = [{ value: "", label: "Choose a lane" }];
  for (const lane of catalog.lanes) options.push({ value: lane.id, label: lane.label });
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

function walkBoxes(selected) {
  const box = document.createElement("div");
  box.className = "walks";
  for (const topic of catalog.topics) {
    if (topic.id === "all") continue;
    const wrap = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "walks";
    input.value = topic.id;
    input.checked = selected.includes(topic.id);
    wrap.append(input, document.createTextNode(` ${topic.label}`));
    box.append(wrap);
  }
  return box;
}

async function api(path, options = {}) {
  const headers = { authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ""}` };
  if (options.body) headers["content-type"] = "application/json";
  const response = await fetch(path, { method: options.method || "GET", headers, body: options.body });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (response.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    gate.hidden = false;
    desk.hidden = true;
    gateError.textContent = payload.error || "This review is for a Pennsylvania-licensed attorney.";
    throw new Error(gateError.textContent);
  }
  if (!response.ok) throw new Error(payload.error || "The review request failed.");
  return payload;
}
