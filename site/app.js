import {
  DISCLAIMER,
  SCOPE_MESSAGE,
  dotIsDim,
  laneIsDim,
  present,
  quoteableDate,
  storedText,
} from "./tree.js";

const STATUS_LABEL = {
  in_force: "In force",
  superseded: "Superseded",
  not_yet_checked: "Not yet checked",
  limited_by_court: "Limited by a court",
};

const state = {
  record: null,
  filter: { kind: "topic", id: "all" },
  selected: null,
  context: new Map(),
  contextError: "",
  busy: false,
};

const topicsEl = document.querySelector("#topics");
const stripEl = document.querySelector("#strip");
const columnEl = document.querySelector("#column");
const paneEl = document.querySelector("#pane");
const proposalForm = document.querySelector("#proposal-form");
const scenarioForm = document.querySelector("#scenario-form");
const proposalToggle = document.querySelector("#proposal-toggle");
const scenarioToggle = document.querySelector("#scenario-toggle");

document.querySelector("#disclaimer").textContent = DISCLAIMER;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function view() {
  return present(state.record, state.filter);
}

function select(id) {
  state.selected = id;
  state.contextError = "";
  render();
}

function setTopic(id) {
  state.filter = { kind: "topic", id };
  state.contextError = "";
  clearAskErrors();
  const next = present(state.record, state.filter);
  state.selected = next.moments[0]?.id || state.record.moments[0]?.id || null;
  render();
}

function render() {
  const record = state.record;
  const current = view();
  renderTopics(current);
  renderStrip(record, current);
  renderColumn(record, current);
  renderPane(record, current);
}

function renderTopics() {
  topicsEl.replaceChildren();
  for (const topic of state.record.topics) {
    const button = el("button", "topic", topic.label);
    button.type = "button";
    const pressed = state.filter.kind === "topic" && state.filter.id === topic.id;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    button.addEventListener("click", () => setTopic(topic.id));
    topicsEl.append(button);
  }
  proposalToggle.setAttribute("aria-pressed", state.filter.kind === "proposal" ? "true" : "false");
  scenarioToggle.setAttribute("aria-pressed", state.filter.kind === "scenario" ? "true" : "false");
}

function renderStrip(record, current) {
  stripEl.replaceChildren();
  const scale = el("p", "unplaced-label", "1776 to the present. A dot with no checked date stays off the scale.");
  stripEl.append(scale);
  for (const lane of record.lanes) {
    const row = el("div", "lane");
    if (laneIsDim(record, current.activeIds, lane.id)) row.classList.add("dim");
    row.append(el("div", "lane-name", lane.label));
    const track = el("div", "lane-track");
    const checked = record.moments.filter(
      (moment) => moment.lane === lane.id && quoteableDate(moment),
    );
    checked.forEach((moment, index) => {
      const year = Number(String(moment.sort).slice(0, 4));
      const dot = el("button", "dot");
      dot.type = "button";
      dot.style.left = `${((year - 1776) / (2026 - 1776)) * 100}%`;
      dot.style.top = `${4 + (index % 2) * 2}px`;
      markDot(dot, moment, current);
      track.append(dot);
    });
    row.append(track);
    stripEl.append(row);
  }
  const band = el("div", "unplaced");
  band.append(el("p", "unplaced-label", "Not placed. The date has not been checked."));
  const row = el("div", "unplaced-row");
  for (const moment of record.moments.filter((moment) => !quoteableDate(moment))) {
    const dot = el("button", "dot labeled", moment.title);
    dot.type = "button";
    markDot(dot, moment, current);
    row.append(dot);
  }
  band.append(row);
  stripEl.append(band);
}

function markDot(dot, moment, current) {
  dot.title = moment.title;
  dot.setAttribute("aria-label", moment.title);
  if (!dotIsDim(current.activeIds, moment.id)) dot.classList.add("in-filter");
  else dot.classList.add("dim");
  if (state.selected === moment.id) dot.setAttribute("aria-current", "true");
  dot.addEventListener("click", () => select(moment.id));
}

function renderColumn(record, current) {
  columnEl.replaceChildren();
  if (current.guide && current.guide.length) {
    const guide = el("div", "guide");
    guide.append(el("p", "kicker", "Guide"));
    guide.append(el("h2", null, "Not the statute"));
    for (const block of current.guide) {
      const section = el("div", "guide-block");
      section.append(el("h3", null, block.heading));
      section.append(el("p", null, block.prose));
      guide.append(section);
    }
    columnEl.append(guide);
  }
  if (current.unloaded) {
    const topic = record.topics.find((item) => item.id === state.filter.id);
    const notice = el("div", "notice");
    notice.append(el("h2", null, topic ? topic.label : "This walk"));
    notice.append(el("p", null, "This walk is not loaded."));
    columnEl.append(notice);
    return;
  }
  if (current.mode === "all" && current.moments.some((moment) => moment.status === "not_yet_checked")) {
    const notice = el("div", "notice");
    notice.append(el("p", null, "Dates on this list have not been checked. Do not quote them."));
    columnEl.append(notice);
  }
  for (const moment of current.moments) {
    columnEl.append(momentButton(moment, false));
  }
  current.outside.forEach((item, index) => {
    const button = el("button", "moment-button dim");
    button.type = "button";
    const id = `outside:${index}`;
    if (state.selected === id) button.setAttribute("aria-current", "true");
    button.append(el("span", "moment-meta", "Outside the record"));
    button.append(el("strong", null, item.name));
    button.addEventListener("click", () => select(id));
    columnEl.append(button);
  });
  if (!current.moments.length && !current.outside.length) {
    const sentence = current.mode === "all" ? "Nothing is on the record yet." : "Nothing on the record matched.";
    columnEl.append(el("p", "missing", sentence));
  }
}

function momentButton(moment, dim) {
  const button = el("button", dim ? "moment-button dim" : "moment-button");
  button.type = "button";
  if (state.selected === moment.id) button.setAttribute("aria-current", "true");
  const date = quoteableDate(moment);
  button.append(el("span", "moment-meta", date ? date.text : "Date not checked"));
  button.append(el("strong", null, moment.title));
  button.append(el("span", "moment-meta", STATUS_LABEL[moment.status] || moment.status));
  button.addEventListener("click", () => select(moment.id));
  return button;
}

function renderPane(record, current) {
  paneEl.replaceChildren();
  const outside = current.outside.find((item, index) => state.selected === `outside:${index}`);
  if (outside) {
    paneEl.append(el("p", "kicker", "Outside the record"));
    paneEl.append(el("h2", null, outside.name));
    paneEl.append(el("p", null, SCOPE_MESSAGE));
    if (outside.why) paneEl.append(el("p", null, outside.why));
    const outsideIndex = current.outside.indexOf(outside);
    paneEl.append(contextControl(`outside:${outsideIndex}`, outside.name, null));
    return;
  }
  const moment = record.moments.find((item) => item.id === state.selected) || current.moments[0] || record.moments[0];
  if (!moment) {
    paneEl.append(el("p", "missing", "Nothing is selected."));
    return;
  }
  state.selected = moment.id;
  paneEl.append(el("p", "kicker", record.lanes.find((lane) => lane.id === moment.lane)?.label || ""));
  paneEl.append(el("h2", null, moment.title));
  paneEl.append(el("p", "status", STATUS_LABEL[moment.status] || moment.status));
  const date = quoteableDate(moment);
  if (date && date.kind === "approval") {
    paneEl.append(el("p", null, `Approval date, not the day it began to bind: ${date.text}`));
  } else if (date) {
    paneEl.append(el("p", null, date.text));
  } else {
    paneEl.append(el("p", null, moment.effectiveStatement));
  }
  if (moment.citation && date) paneEl.append(el("p", null, moment.citation));
  if (moment.whatChanged && date) paneEl.append(el("p", null, moment.whatChanged));
  const text = storedText(moment);
  if (text) {
    const quote = el("blockquote", "quotation");
    quote.textContent = text;
    paneEl.append(quote);
  } else {
    paneEl.append(el("p", "missing", "Text not loaded."));
  }
  paneEl.append(contextControl(moment.id, moment.title, moment));
}

function contextControl(key, title, moment) {
  const wrap = el("div", "background");
  const button = el("button", "context-button", state.busy ? "Reading…" : "Provide context");
  button.type = "button";
  button.disabled = state.busy;
  button.addEventListener("click", () => askContext(key, title, moment));
  wrap.append(button);
  if (state.contextError && state.selected === key) wrap.append(el("p", "ask-error", state.contextError));
  const prose = state.context.get(key);
  if (prose) {
    wrap.append(el("p", "kicker", "Background"));
    wrap.append(el("p", null, prose));
  }
  return wrap;
}

async function askContext(key, title, moment) {
  state.busy = true;
  state.contextError = "";
  render();
  try {
    const response = await fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        modelNote: moment ? moment.modelNote : "",
        loadedText: moment ? storedText(moment) : null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Provide context failed.");
    state.context.set(key, payload.background);
  } catch (error) {
    state.contextError = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

function clearAskErrors() {
  document.querySelector("#proposal-error").textContent = "";
  document.querySelector("#scenario-error").textContent = "";
}

async function askRecord(kind, text, errorEl) {
  clearAskErrors();
  errorEl.textContent = "";
  if (!text.trim()) {
    errorEl.textContent = "Write something first.";
    return;
  }
  state.busy = true;
  render();
  try {
    const response = await fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        text: text.slice(0, 12000),
        moments: state.record.moments.map((moment) => ({
          id: moment.id,
          title: moment.title,
          walks: moment.walks,
          note: moment.modelNote,
        })),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The guide failed.");
    state.filter = {
      kind,
      momentIds: payload.momentIds,
      outside: payload.outside,
      guide: payload.guide,
    };
    const next = present(state.record, state.filter);
    state.selected = next.moments[0]?.id || (next.outside[0] ? "outside:0" : null);
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

proposalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askRecord("proposal", document.querySelector("#proposal-text").value, document.querySelector("#proposal-error"));
});
scenarioForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askRecord("scenario", document.querySelector("#scenario-text").value, document.querySelector("#scenario-error"));
});
proposalToggle.addEventListener("click", () => document.querySelector("#proposal-text").focus());
scenarioToggle.addEventListener("click", () => document.querySelector("#scenario-text").focus());

async function loadPublishedRecord() {
  try {
    const response = await fetch("/api/record");
    if (response.ok) return await response.json();
  } catch {
    // The static file remains when the merge endpoint is down.
  }
  const response = await fetch("/record.json");
  if (!response.ok) throw new Error("The record could not be loaded.");
  return response.json();
}

state.record = await loadPublishedRecord();
state.selected = state.record.moments.slice().sort((a, b) => (a.sort < b.sort ? -1 : 1))[0]?.id || null;
render();
