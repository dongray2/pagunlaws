export const SCOPE_MESSAGE = "This law may be outside the scope of this site.";

export const DISCLAIMER =
  "This is not legal advice. The official text is the Laws of Pennsylvania and the Pennsylvania Consolidated Statutes.";

const GUIDE_HEADINGS = new Set([
  "The shooting",
  "The weapon",
  "The manner",
  "The place",
  "Runs into",
]);

export function isChecked(moment) {
  return (
    moment.status !== "not_yet_checked" &&
    moment.dateKind !== "unchecked" &&
    moment.textState === "loaded" &&
    typeof moment.text === "string" &&
    moment.text.length > 0 &&
    typeof moment.citation === "string" &&
    moment.citation.length > 0
  );
}

export function momentById(record, id) {
  return record.moments.find((moment) => moment.id === id) || null;
}

export function compareMoments(a, b) {
  if (a.sort < b.sort) return -1;
  if (a.sort > b.sort) return 1;
  if (a.title < b.title) return -1;
  if (a.title > b.title) return 1;
  return 0;
}

export function present(record, filter) {
  if (filter.kind === "topic") {
    if (filter.id === "all") {
      const moments = record.moments.slice().sort(compareMoments);
      return {
        mode: "all",
        moments,
        outside: [],
        guide: null,
        unloaded: false,
        activeIds: new Set(moments.map((moment) => moment.id)),
      };
    }
    const members = record.moments
      .filter((moment) => moment.walks.includes(filter.id))
      .sort(compareMoments);
    const checked = members.filter(isChecked);
    if (checked.length === 0) {
      return {
        mode: "unloaded",
        moments: [],
        outside: [],
        guide: null,
        unloaded: true,
        activeIds: new Set(),
      };
    }
    return {
      mode: "walk",
      moments: checked,
      outside: [],
      guide: null,
      unloaded: false,
      activeIds: new Set(checked.map((moment) => moment.id)),
    };
  }

  const seen = new Set();
  const moments = [];
  for (const id of filter.momentIds || []) {
    if (seen.has(id)) continue;
    const moment = momentById(record, id);
    if (!moment) continue;
    seen.add(id);
    moments.push(moment);
  }
  moments.sort(compareMoments);
  return {
    mode: "ai",
    moments,
    outside: filter.outside || [],
    guide: filter.guide || [],
    unloaded: false,
    activeIds: new Set(moments.map((moment) => moment.id)),
  };
}

export function laneIsDim(record, activeIds, laneId) {
  if (activeIds.size === 0) return true;
  return !record.moments.some(
    (moment) => activeIds.has(moment.id) && moment.lane === laneId,
  );
}

export function dotIsDim(activeIds, momentId) {
  return !activeIds.has(momentId);
}

export function quoteableDate(moment) {
  if (!isChecked(moment)) return null;
  if (moment.dateKind === "effective") {
    return { kind: "effective", text: moment.effectiveStatement };
  }
  if (moment.dateKind === "approval") {
    return { kind: "approval", text: moment.effectiveStatement };
  }
  return null;
}

export function sanitizeModelResult(record, raw) {
  const known = new Set(record.moments.map((moment) => moment.id));
  const momentIds = [];
  for (const id of (raw && raw.momentIds) || []) {
    if (typeof id !== "string" || !known.has(id) || momentIds.includes(id)) continue;
    momentIds.push(id);
  }
  const outside = [];
  for (const item of (raw && raw.outside) || []) {
    if (!item || typeof item.name !== "string" || item.name.trim() === "") continue;
    outside.push({
      name: item.name.trim().slice(0, 200),
      why: typeof item.why === "string" ? item.why.trim().slice(0, 500) : "",
    });
  }
  const guide = [];
  for (const block of (raw && raw.guide) || []) {
    if (!block || !GUIDE_HEADINGS.has(block.heading)) continue;
    const blockIds = [];
    for (const id of block.momentIds || []) {
      if (momentIds.includes(id) && !blockIds.includes(id)) blockIds.push(id);
    }
    guide.push({
      heading: block.heading,
      momentIds: blockIds,
      prose: typeof block.prose === "string" ? block.prose.trim().slice(0, 2000) : "",
    });
  }
  return { momentIds, outside, guide };
}

export function storedText(moment) {
  if (!moment || moment.textState !== "loaded" || typeof moment.text !== "string") {
    return null;
  }
  return moment.text;
}
