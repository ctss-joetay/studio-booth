import { mkdir } from "node:fs/promises";
import { config } from "./config";
import { runCleanup } from "./shots";

const MINUTE = 60 * 1000;

/** Runs once when the server starts. Returns a function that stops the cleanup timer. */
export async function startup(): Promise<() => void> {
  await mkdir(config.shotsDir, { recursive: true });
  if (config.seedreamFake) console.warn("[startup] fake mode — photos are tinted, not sent to the AI");
  const tick = async () => {
    try {
      const removed = await runCleanup();
      if (removed) console.log(`[cleanup] deleted ${removed} photo(s)`);
    } catch (error) {
      console.error("[cleanup] failed", error);
    }
  };
  await tick();
  const timer = setInterval(tick, MINUTE);
  timer.unref();
  return () => clearInterval(timer);
}
