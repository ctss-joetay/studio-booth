import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FONT_REGULAR, FONT_SEMIBOLD, config } from "@/lib/config";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("config", () => {
  it("is in fake mode without a key or with SEEDREAM_FAKE=1", () => {
    process.env.SEEDREAM_FAKE = "";
    process.env.OPENROUTER_API_KEY = "";
    expect(config.seedreamFake).toBe(true);
    process.env.OPENROUTER_API_KEY = "sk-or-x";
    expect(config.seedreamFake).toBe(false);
    process.env.SEEDREAM_FAKE = "1";
    expect(config.seedreamFake).toBe(true);
  });

  it("needs BOOTH_PIN and a 32+ character SESSION_SECRET", () => {
    delete process.env.BOOTH_PIN;
    expect(() => config.boothPin).toThrow("BOOTH_PIN");
    process.env.SESSION_SECRET = "short";
    expect(() => config.sessionSecret).toThrow("32");
  });

  it("defaults: model, 150 shots an hour, shots under DATA_DIR", () => {
    delete process.env.SEEDREAM_MODEL;
    delete process.env.MAX_SHOTS_PER_HOUR;
    expect(config.seedreamModel).toBe("bytedance-seed/seedream-5-0-flash");
    expect(config.maxShotsPerHour).toBe(150);
    expect(config.shotsDir).toBe(path.join(process.env.DATA_DIR!, "shots"));
  });

  it("reads MAX_SHOTS_PER_HOUR and ignores nonsense", () => {
    process.env.MAX_SHOTS_PER_HOUR = "20";
    expect(config.maxShotsPerHour).toBe(20);
    process.env.MAX_SHOTS_PER_HOUR = "lots";
    expect(config.maxShotsPerHour).toBe(150);
  });

  it("bundles the Bodoni Moda fonts", () => {
    expect(existsSync(FONT_REGULAR)).toBe(true);
    expect(existsSync(FONT_SEMIBOLD)).toBe(true);
  });
});
