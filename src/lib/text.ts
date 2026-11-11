const MAX_EVENT_NAME = 40;

/** The event name from Setup, safe to print: no control characters, single spaces, at most 40 characters. */
export function cleanEventName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(clean).slice(0, MAX_EVENT_NAME).join("");
}
