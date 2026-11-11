import { config } from "./config";

const HOUR = 60 * 60 * 1000;
const PIN_WINDOW = 10 * 60 * 1000;
const MAX_PIN_FAILURES = 10;

let developing = false;
let aiCalls: number[] = [];
const pinFailures = new Map<string, number[]>();

/**
 * Claims the booth for one photo: only one develops at a time, and at most MAX_SHOTS_PER_HOUR AI calls run in
 * any rolling hour (failed ones count, because they can still cost). Call release() when the photo is done.
 */
export function startShot(now = Date.now()): { release(): void } | "busy" | "hourly" {
  if (developing) return "busy";
  aiCalls = aiCalls.filter((t) => now - t < HOUR);
  if (aiCalls.length >= config.maxShotsPerHour) return "hourly";
  developing = true;
  aiCalls.push(now);
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      developing = false;
    },
  };
}

export function pinBlocked(ip: string, now = Date.now()): boolean {
  const recent = (pinFailures.get(ip) ?? []).filter((t) => now - t < PIN_WINDOW);
  pinFailures.set(ip, recent);
  return recent.length >= MAX_PIN_FAILURES;
}

export function recordPinFailure(ip: string, now = Date.now()): void {
  pinFailures.set(ip, [...(pinFailures.get(ip) ?? []), now]);
}

/** Tests only. */
export function resetGuards(): void {
  developing = false;
  aiCalls = [];
  pinFailures.clear();
}
