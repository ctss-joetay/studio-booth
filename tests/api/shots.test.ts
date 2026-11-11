import { mkdir, readdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", async () => (await import("../helpers/cookies")).nextHeadersMock);

import { POST as unlock } from "@/app/api/session/route";
import { POST as shoot } from "@/app/api/shots/route";
import { DELETE as removeShot } from "@/app/api/shots/[token]/route";
import { GET as boothImage } from "@/app/api/shots/[token]/image/route";
import { POST as testAi } from "@/app/api/test-ai/route";
import { config } from "@/lib/config";
import { setEditorForTests } from "@/lib/editor";
import { resetGuards } from "@/lib/guards";
import { SeedreamError, type EditImageFn } from "@/lib/seedream";
import { getShot } from "@/lib/shots";
import { buildPrompt } from "@/lib/styles";
import { ctx, jsonRequest, shotRequest } from "../helpers/api";
import { clearCookies } from "../helpers/cookies";
import { noisyJpeg, solidImage } from "../helpers/images";

let calls: { prompt: string; jpeg: Buffer }[] = [];
const okEditor: EditImageFn = async (prompt, jpeg) => {
  calls.push({ prompt, jpeg });
  return { image: await solidImage(600, 900, "jpeg", { r: 40, g: 40, b: 40 }), costUsd: 0.02 };
};

const saved = { ...process.env };
beforeEach(async () => {
  clearCookies();
  resetGuards();
  calls = [];
  setEditorForTests(okEditor);
  process.env.PUBLIC_URL = "http://booth.test";
  await rm(config.shotsDir, { recursive: true, force: true });
  await mkdir(config.shotsDir, { recursive: true });
});
afterEach(() => {
  setEditorForTests(null);
  process.env = { ...saved };
});

const unlockBooth = () => unlock(jsonRequest("/api/session", "POST", { pin: "2468" }));
const goodShot = async () => ({ photo: await noisyJpeg(3000, 2000), style: "magazine", backdrop: "black", framing: "full" });
const shotFiles = async () => (await readdir(config.shotsDir)).filter((f) => !f.endsWith(".tmp"));

describe("taking a photo", () => {
  it("needs the booth PIN", async () => {
    const res = await shoot(shotRequest(await goodShot()));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Enter the booth PIN." });
    expect(calls).toHaveLength(0);
  });

  it("develops a photo and hands back its QR link", async () => {
    await unlockBooth();
    const res = await shoot(shotRequest({ ...(await goodShot()), eventName: "Open House" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; imageUrl: string; downloadUrl: string; qrSvg: string; deleteAt: number };
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(body.imageUrl).toBe(`/api/shots/${body.token}/image`);
    expect(body.downloadUrl).toBe(`http://booth.test/p/${body.token}`);
    expect(body.qrSvg.startsWith("<svg")).toBe(true);
    expect(body.deleteAt).toBe((await getShot(body.token))!.createdAt + 3_600_000);
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toBe(buildPrompt("magazine", "black", "full"));
    const sent = await sharp(calls[0].jpeg).metadata();
    expect(Math.max(sent.width!, sent.height!)).toBeLessThanOrEqual(2048);
    expect((await shotFiles()).sort()).toEqual([`${body.token}.jpg`, `${body.token}.json`].sort());
  });

  it.each([
    [{ style: "vogue" }, "Choose a style."],
    [{ backdrop: "red" }, "Choose a backdrop."],
    [{ framing: "knees" }, "Choose half or full body."],
    [{ photo: null }, "No photo arrived. Try again."],
  ])("refuses a bad request: %o", async (change, message) => {
    await unlockBooth();
    const res = await shoot(shotRequest({ ...(await goodShot()), ...change }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message });
    expect(calls).toHaveLength(0);
  });

  it("refuses something that isn't a photo", async () => {
    await unlockBooth();
    const res = await shoot(shotRequest({ ...(await goodShot()), photo: Buffer.from("not a photo") }));
    expect(res.status).toBe(415);
  });

  it("second shot while one is developing", async () => {
    await unlockBooth();
    let release!: () => void;
    let started!: () => void;
    const inEditor = new Promise<void>((r) => (started = r));
    setEditorForTests(async (prompt, jpeg) => {
      started();
      await new Promise<void>((r) => (release = r));
      return okEditor(prompt, jpeg);
    });
    const first = shoot(shotRequest(await goodShot()));
    await inEditor;
    const second = await shoot(shotRequest(await goodShot()));
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "Still developing the last photo." });
    release();
    expect((await first).status).toBe(200);
    setEditorForTests(okEditor);
    expect((await shoot(shotRequest(await goodShot()))).status).toBe(200);
  });

  it.each([
    ["timeout", 503, "The AI took too long. Try again."],
    ["busy", 503, "The AI is busy. Try again in a moment."],
    ["refused", 422, "The AI couldn't develop this one. Try again or pick another style."],
    ["no_image", 422, "The AI couldn't develop this one. Try again or pick another style."],
    ["auth", 502, "The AI service isn't available. Fetch a student helper."],
    ["budget", 502, "The AI service isn't available. Fetch a student helper."],
    ["upstream", 502, "The AI service had a problem. Try again."],
  ] as const)("AI failure: %s", async (kind, status, message) => {
    await unlockBooth();
    setEditorForTests(async () => {
      throw new SeedreamError(kind, "details for helpers");
    });
    const res = await shoot(shotRequest(await goodShot()));
    expect(res.status).toBe(status);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe(message);
    expect(body.detail).toContain(kind);
    expect(await shotFiles()).toEqual([]);
    setEditorForTests(okEditor);
    expect((await shoot(shotRequest(await goodShot()))).status).toBe(200);
  });

  it("stops at the hourly limit, counting failed AI calls too", async () => {
    process.env.MAX_SHOTS_PER_HOUR = "2";
    await unlockBooth();
    setEditorForTests(async () => {
      throw new SeedreamError("refused", "no");
    });
    expect((await shoot(shotRequest(await goodShot()))).status).toBe(422);
    setEditorForTests(okEditor);
    expect((await shoot(shotRequest(await goodShot()))).status).toBe(200);
    const third = await shoot(shotRequest(await goodShot()));
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ error: "The booth is taking a short breather. Try again in a few minutes." });
  });
});

describe("after the photo", () => {
  const take = async () => {
    await unlockBooth();
    return ((await (await shoot(shotRequest(await goodShot()))).json()) as { token: string }).token;
  };

  it("shows the booth its photo without starting the download clock", async () => {
    const token = await take();
    const res = await boothImage(new Request(`http://booth.test/api/shots/${token}/image`), ctx({ token }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect((await getShot(token))!.downloadedAt).toBeNull();
  });

  it("keeps the booth's photo route behind the PIN", async () => {
    const token = await take();
    clearCookies();
    const res = await boothImage(new Request(`http://booth.test/api/shots/${token}/image`), ctx({ token }));
    expect(res.status).toBe(401);
  });

  it("Retake deletes the previous photo at once", async () => {
    const token = await take();
    const res = await removeShot(new Request(`http://booth.test/api/shots/${token}`, { method: "DELETE" }), ctx({ token }));
    expect(res.status).toBe(204);
    expect(await shotFiles()).toEqual([]);
    const again = await removeShot(new Request("http://booth.test/api/shots/x", { method: "DELETE" }), ctx({ token: "AAAAAAAAAAAAAAAAAAAAAA" }));
    expect(again.status).toBe(204);
  });

  it("only the booth can delete", async () => {
    const token = await take();
    clearCookies();
    const res = await removeShot(new Request(`http://booth.test/api/shots/${token}`, { method: "DELETE" }), ctx({ token }));
    expect(res.status).toBe(401);
    expect(await shotFiles()).toHaveLength(2);
  });
});

describe("testing the AI from Setup", () => {
  it("runs one edit and stores nothing", async () => {
    await unlockBooth();
    const res = await testAi(jsonRequest("/api/test-ai", "POST", {}));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; mode: string; seconds: number };
    expect(body).toMatchObject({ ok: true, mode: "fake" });
    expect(typeof body.seconds).toBe("number");
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toBe(buildPrompt("professional", "grey", "half"));
    expect(await shotFiles()).toEqual([]);
  });

  it("reports the AI's error", async () => {
    await unlockBooth();
    setEditorForTests(async () => {
      throw new SeedreamError("auth", "User not found.", 401);
    });
    const body = (await (await testAi(jsonRequest("/api/test-ai", "POST", {}))).json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("User not found.");
  });

  it("needs the PIN", async () => {
    expect((await testAi(jsonRequest("/api/test-ai", "POST", {}))).status).toBe(401);
  });
});
