/**
 * Real-model probe — not part of the app or the tests. Runs every style on your own test photos through the real
 * Seedream API, with the real prompts and overlays, and writes before/after contact sheets so faces can be checked
 * by eye before the open house.
 *
 * Usage:
 *   1. OPENROUTER_API_KEY=... in .env.local
 *   2. Photos in probe/photos/ (JPEG/PNG). Framing is full body unless the file name contains "half".
 *   3. npm run probe                         (all 10 styles; about $0.02–0.04 per image)
 *      PROBE_STYLES=bw,film npm run probe    (only some styles)
 *      PROBE_BACKDROP=green npm run probe    (grey by default)
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prepareForModel, toJpeg } from "../src/lib/images";
import { applyOverlay } from "../src/lib/overlays";
import { editImage, SeedreamError } from "../src/lib/seedream";
import { STYLES, buildPrompt, getStyle, isBackdropId, isStyleId, type StyleId } from "../src/lib/styles";

const PHOTOS = path.join("probe", "photos");
const OUT = path.join("probe", "out");
const TILE_H = 520;
const PER_ROW = 4;

async function tile(image: Buffer, label: string): Promise<Buffer> {
  const { data, info } = await sharp(image).resize({ height: TILE_H }).toBuffer({ resolveWithObject: true });
  const safe = label.replace(/[&<>]/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="40"><rect width="100%" height="100%" fill="#111"/>` +
    `<text x="12" y="27" font-family="Helvetica" font-size="22" fill="#fff">${safe}</text></svg>`;
  return sharp({ create: { width: info.width, height: TILE_H + 40, channels: 3, background: "#fff" } })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: data, top: 40, left: 0 },
    ])
    .jpeg()
    .toBuffer();
}

/** Tiles in rows of four, so one sheet shows a photo and all its styles. */
async function sheet(tiles: Buffer[], file: string): Promise<void> {
  const widths = await Promise.all(tiles.map(async (t) => (await sharp(t).metadata()).width!));
  const composite: { input: Buffer; top: number; left: number }[] = [];
  let width = 0;
  for (let start = 0; start < tiles.length; start += PER_ROW) {
    let left = 0;
    for (let i = start; i < Math.min(start + PER_ROW, tiles.length); i++) {
      composite.push({ input: tiles[i], top: (start / PER_ROW) * (TILE_H + 50), left });
      left += widths[i] + 10;
    }
    width = Math.max(width, left - 10);
  }
  const rows = Math.ceil(tiles.length / PER_ROW);
  await sharp({ create: { width, height: rows * (TILE_H + 50), channels: 3, background: "#fff" } })
    .composite(composite)
    .jpeg({ quality: 82 })
    .toFile(file);
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local: use the environment as it is.
  }
  if (!process.env.OPENROUTER_API_KEY) throw new Error("Put OPENROUTER_API_KEY in .env.local first.");
  const wanted = process.env.PROBE_STYLES ? process.env.PROBE_STYLES.split(",").map((s) => s.trim()) : STYLES.map((s) => s.id);
  const styles = wanted.filter(isStyleId) as StyleId[];
  const backdrop = isBackdropId(process.env.PROBE_BACKDROP) ? process.env.PROBE_BACKDROP : "grey";
  const photos = (await readdir(PHOTOS).catch(() => [] as string[])).filter((f) => /\.(jpe?g|png)$/i.test(f));
  if (!photos.length) throw new Error(`Put some photos in ${PHOTOS}/ first.`);
  await mkdir(OUT, { recursive: true });

  let total = 0;
  for (const file of photos) {
    const name = file.replace(/\.[^.]+$/, "");
    const framing = /half/i.test(name) ? "half" : "full";
    const prepared = await prepareForModel(await readFile(path.join(PHOTOS, file)));
    const tiles: Buffer[] = [await tile(prepared, `${name}: before (${framing} body)`)];
    // Three at a time keeps well inside OpenRouter's limits.
    for (let i = 0; i < styles.length; i += 3) {
      const results = await Promise.all(
        styles.slice(i, i + 3).map(async (style) => {
          const started = Date.now();
          try {
            const result = await editImage(buildPrompt(style, backdrop, framing), prepared);
            const finished = await applyOverlay(getStyle(style).overlay, await toJpeg(result.image), {
              eventName: "Open House",
              date: new Date(),
            });
            await writeFile(path.join(OUT, `${name}__${style}.jpg`), finished);
            total += result.costUsd ?? 0;
            console.log(`${name} · ${style}: ${((Date.now() - started) / 1000).toFixed(1)} s · $${result.costUsd ?? "?"}`);
            return tile(finished, getStyle(style).name);
          } catch (error) {
            const why = error instanceof SeedreamError ? `${error.kind} (${error.status ?? "-"}): ${error.message}` : String(error);
            console.log(`${name} · ${style}: FAILED ${why}`);
            return null;
          }
        }),
      );
      tiles.push(...results.filter((t): t is Buffer => t !== null));
    }
    await sheet(tiles, path.join(OUT, `sheet-${name}.jpg`));
    console.log(`→ ${path.join(OUT, `sheet-${name}.jpg`)}`);
  }
  console.log(`Total cost reported: $${total.toFixed(3)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
