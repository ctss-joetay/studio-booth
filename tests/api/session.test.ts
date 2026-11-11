import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", async () => (await import("../helpers/cookies")).nextHeadersMock);

import { DELETE as lock, GET as status, POST as unlock } from "@/app/api/session/route";
import { resetGuards } from "@/lib/guards";
import { jsonRequest } from "../helpers/api";
import { clearCookies } from "../helpers/cookies";

const tryPin = (pin: unknown, ip = "10.0.0.1") => unlock(jsonRequest("/api/session", "POST", { pin }, ip));
const unlocked = async () => ((await (await status()).json()) as { unlocked: boolean }).unlocked;

const savedPin = process.env.BOOTH_PIN;
beforeEach(() => {
  clearCookies();
  resetGuards();
  process.env.BOOTH_PIN = "2468";
});
afterEach(() => {
  vi.useRealTimers();
  process.env.BOOTH_PIN = savedPin;
});

describe("booth PIN", () => {
  it("unlocks the booth with the right PIN", async () => {
    expect(await unlocked()).toBe(false);
    const res = await tryPin("2468");
    expect(res.status).toBe(200);
    expect(await unlocked()).toBe(true);
  });

  it("refuses a wrong PIN", async () => {
    const res = await tryPin("1111");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "That PIN isn't right." });
    expect(await unlocked()).toBe(false);
    expect((await tryPin(2468)).status).toBe(401);
  });

  it("blocks an address after 10 wrong PINs in 10 minutes", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    for (let i = 0; i < 10; i++) expect((await tryPin("0000")).status).toBe(401);
    const blocked = await tryPin("2468");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Too many tries. Wait a few minutes." });
    expect((await tryPin("2468", "10.0.0.2")).status).toBe(200);
    vi.setSystemTime(1_000_000 + 10 * 60_000 + 1);
    expect((await tryPin("2468")).status).toBe(200);
  });

  it("locks every iPad when the PIN is changed", async () => {
    await tryPin("2468");
    process.env.BOOTH_PIN = "9753";
    expect(await unlocked()).toBe(false);
  });

  it("locks the booth on request", async () => {
    await tryPin("2468");
    await lock();
    expect(await unlocked()).toBe(false);
  });
});
