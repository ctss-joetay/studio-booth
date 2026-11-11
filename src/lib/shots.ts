import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config";
import type { StyleId } from "./styles";

/** Every photo is deleted an hour after it is taken… */
export const SHOT_TTL_MS = 60 * 60 * 1000;
/** …or five minutes after it first reaches a guest's phone, whichever is sooner. */
export const AFTER_DOWNLOAD_MS = 5 * 60 * 1000;
/** Half-written files older than this were left by a crash. */
const STALE_TMP_MS = 5 * 60 * 1000;

export interface ShotMeta {
  token: string;
  style: StyleId;
  createdAt: number;
  downloadedAt: number | null;
  width: number;
  height: number;
}

const TOKEN = /^[A-Za-z0-9_-]{22}$/;
/** Tokens being written right now; cleanup leaves them alone (one server, so in-process is enough). */
const saving = new Set<string>();

export function isToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

const jpgPath = (token: string) => path.join(config.shotsDir, `${token}.jpg`);
const jsonPath = (token: string) => path.join(config.shotsDir, `${token}.json`);

export function deleteAt(meta: Pick<ShotMeta, "createdAt" | "downloadedAt">): number {
  const hour = meta.createdAt + SHOT_TTL_MS;
  return meta.downloadedAt === null ? hour : Math.min(hour, meta.downloadedAt + AFTER_DOWNLOAD_MS);
}

/** Writes via a temporary name and a rename, so a crash never leaves half a file under the real name. */
async function writeAtomic(file: string, data: Buffer | string): Promise<void> {
  await writeFile(`${file}.tmp`, data);
  await rename(`${file}.tmp`, file);
}

export async function saveShot(jpeg: Buffer, style: StyleId, now = Date.now()): Promise<ShotMeta> {
  await mkdir(config.shotsDir, { recursive: true });
  const token = randomBytes(16).toString("base64url");
  const { width, height } = await sharp(jpeg).metadata();
  const meta: ShotMeta = { token, style, createdAt: now, downloadedAt: null, width: width ?? 0, height: height ?? 0 };
  saving.add(token);
  try {
    await writeAtomic(jpgPath(token), jpeg);
    await writeAtomic(jsonPath(token), JSON.stringify(meta));
  } finally {
    saving.delete(token);
  }
  return meta;
}

async function readMeta(token: string): Promise<ShotMeta | null> {
  try {
    return JSON.parse(await readFile(jsonPath(token), "utf8")) as ShotMeta;
  } catch {
    return null;
  }
}

/** The shot, or null when the token is malformed, unknown, incomplete or past its deletion time. */
export async function getShot(token: string, now = Date.now()): Promise<ShotMeta | null> {
  if (!isToken(token)) return null;
  const meta = await readMeta(token);
  if (!meta || deleteAt(meta) <= now) return null;
  try {
    await stat(jpgPath(token));
  } catch {
    return null;
  }
  return meta;
}

export async function readShotImage(token: string): Promise<Buffer> {
  if (!isToken(token)) throw new Error("Bad token");
  return readFile(jpgPath(token));
}

/** Records the first time the photo reached a guest's phone. Later downloads don't move the clock. */
export async function markDownloaded(token: string, now = Date.now()): Promise<ShotMeta | null> {
  const meta = await getShot(token, now);
  if (!meta) return null;
  if (meta.downloadedAt !== null) return meta;
  const updated = { ...meta, downloadedAt: now };
  await writeAtomic(jsonPath(token), JSON.stringify(updated));
  return updated;
}

export async function deleteShot(token: string): Promise<void> {
  if (!isToken(token)) return;
  await Promise.all([rm(jpgPath(token), { force: true }), rm(jsonPath(token), { force: true })]);
}

/** Deletes expired shots, orphan halves and stale temporary files. Returns how many were removed. */
export async function runCleanup(now = Date.now()): Promise<number> {
  let names: string[];
  try {
    names = await readdir(config.shotsDir);
  } catch {
    return 0;
  }
  let removed = 0;
  const tokens = new Set<string>();
  for (const name of names) {
    const token = name.slice(0, 22);
    if (!isToken(token) || saving.has(token)) continue;
    if (name.endsWith(".tmp")) {
      const file = path.join(config.shotsDir, name);
      const { mtimeMs } = await stat(file).catch(() => ({ mtimeMs: Date.now() }));
      if (Date.now() - mtimeMs > STALE_TMP_MS) {
        await rm(file, { force: true });
        removed++;
      }
    } else if (name === `${token}.jpg` || name === `${token}.json`) {
      tokens.add(token);
    }
  }
  for (const token of tokens) {
    const hasJpg = names.includes(`${token}.jpg`);
    const meta = names.includes(`${token}.json`) ? await readMeta(token) : null;
    if (!hasJpg || !meta || deleteAt(meta) <= now) {
      await deleteShot(token);
      removed++;
    }
  }
  return removed;
}
