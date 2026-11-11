import { mkdir, readdir, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import {
  AFTER_DOWNLOAD_MS,
  SHOT_TTL_MS,
  deleteAt,
  deleteShot,
  getShot,
  isToken,
  markDownloaded,
  readShotImage,
  runCleanup,
  saveShot,
  type ShotMeta,
} from "@/lib/shots";
import { solidImage } from "../helpers/images";

beforeEach(async () => {
  await rm(config.shotsDir, { recursive: true, force: true });
  await mkdir(config.shotsDir, { recursive: true });
});

describe("shot store", () => {
  it("keeps photos an hour at most, and five minutes after the first download", () => {
    expect(SHOT_TTL_MS).toBe(3_600_000);
    expect(AFTER_DOWNLOAD_MS).toBe(300_000);
  });

  it("deletes after an hour, or five minutes after the first download, whichever is sooner", () => {
    const m = { createdAt: 0, downloadedAt: null } as ShotMeta;
    expect(deleteAt(m)).toBe(3_600_000);
    expect(deleteAt({ ...m, downloadedAt: 600_000 })).toBe(900_000);
    expect(deleteAt({ ...m, downloadedAt: 3_500_000 })).toBe(3_600_000);
  });

  it("saves a shot as two files with a 22-character token", async () => {
    const meta = await saveShot(await solidImage(30, 20), "film", 1000);
    expect(meta.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(meta).toMatchObject({ style: "film", createdAt: 1000, downloadedAt: null, width: 30, height: 20 });
    expect((await readdir(config.shotsDir)).sort()).toEqual([`${meta.token}.jpg`, `${meta.token}.json`].sort());
    expect((await readShotImage(meta.token)).length).toBeGreaterThan(0);
  });

  it("gives every shot a different token", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) tokens.add((await saveShot(await solidImage(4, 4), "bw", 0)).token);
    expect(tokens.size).toBe(20);
  });

  it("hides expired shots and refuses bad tokens without touching the disk", async () => {
    const meta = await saveShot(await solidImage(10, 10), "bw", 0);
    expect(await getShot(meta.token, 3_599_999)).not.toBeNull();
    expect(await getShot(meta.token, 3_600_000)).toBeNull();
    expect(await getShot("../../etc/passwd")).toBeNull();
    expect(isToken("../../etc/passwd")).toBe(false);
    expect(isToken(meta.token)).toBe(true);
    expect(isToken(42)).toBe(false);
  });

  it("only the first download starts the five-minute clock", async () => {
    const meta = await saveShot(await solidImage(10, 10), "bw", 0);
    expect((await markDownloaded(meta.token, 100_000))!.downloadedAt).toBe(100_000);
    expect((await markDownloaded(meta.token, 200_000))!.downloadedAt).toBe(100_000);
    expect(await getShot(meta.token, 399_999)).not.toBeNull();
    expect(await getShot(meta.token, 400_000)).toBeNull();
    expect(await markDownloaded("AAAAAAAAAAAAAAAAAAAAAA", 0)).toBeNull();
  });

  it("deletes a shot at once, and doesn't mind if it's already gone", async () => {
    const meta = await saveShot(await solidImage(10, 10), "bw", 0);
    await deleteShot(meta.token);
    expect(await readdir(config.shotsDir)).toEqual([]);
    await expect(deleteShot(meta.token)).resolves.toBeUndefined();
    await expect(deleteShot("../nope")).resolves.toBeUndefined();
  });

  it("cleanup removes expired shots and orphan files, and keeps the rest", async () => {
    const old = await saveShot(await solidImage(10, 10), "bw", 0);
    const fresh = await saveShot(await solidImage(10, 10), "bw", 3_000_000);
    await writeFile(path.join(config.shotsDir, "AAAAAAAAAAAAAAAAAAAAAA.jpg"), "x");
    expect(await runCleanup(3_700_000)).toBe(2);
    expect(await getShot(old.token, 3_700_000)).toBeNull();
    expect(await getShot(fresh.token, 3_700_000)).not.toBeNull();
    expect((await readdir(config.shotsDir)).sort()).toEqual([`${fresh.token}.jpg`, `${fresh.token}.json`].sort());
  });

  it("cleanup removes half-written files left by a crash, but not ones still being written", async () => {
    const stale = path.join(config.shotsDir, "BBBBBBBBBBBBBBBBBBBBBB.jpg.tmp");
    const writing = path.join(config.shotsDir, "CCCCCCCCCCCCCCCCCCCCCC.jpg.tmp");
    await writeFile(stale, "x");
    await writeFile(writing, "x");
    const now = Date.now();
    await utimes(stale, new Date(now - 10 * 60_000), new Date(now - 10 * 60_000));
    await runCleanup(now);
    expect(await readdir(config.shotsDir)).toEqual(["CCCCCCCCCCCCCCCCCCCCCC.jpg.tmp"]);
  });

  it("cleanup copes with a missing folder", async () => {
    await rm(config.shotsDir, { recursive: true, force: true });
    await expect(runCleanup()).resolves.toBe(0);
  });
});
