import opentype from "opentype.js";
import sharp, { type OverlayOptions } from "sharp";
import { FONT_REGULAR, FONT_SEMIBOLD } from "./config";
import type { StyleDef } from "./styles";

/** Made-up titles only: never a real magazine's name. */
export const MASTHEADS = ["ICON", "GLAM", "LUXE", "MUSE", "ÉLAN", "VERVE"] as const;

export interface OverlayContext {
  eventName: string;
  date: Date;
  random?: () => number;
}

const MAX_EVENT_NAME = 40;
const POLAROID_PAPER = "#fbfbf8";
const POLAROID_INK = "#2a2a2e";

/** The event name from Setup, safe to print: no control characters, single spaces, at most 40 characters. */
export function cleanEventName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(clean).slice(0, MAX_EVENT_NAME).join("");
}

export function polaroidBorder(width: number): { side: number; top: number; bottom: number } {
  const side = Math.round(0.06 * width);
  return { side, top: side, bottom: Math.round(0.22 * width) };
}

// Text is drawn as vector paths straight from the bundled font, so it looks the same on a Mac and on Railway.
// (sharp's own text rendering ignores bundled font files on macOS and silently falls back to a sans.)
const fontCache = new Map<string, opentype.Font>();
function loadFont(semibold: boolean): opentype.Font {
  const file = semibold ? FONT_SEMIBOLD : FONT_REGULAR;
  let font = fontCache.get(file);
  if (!font) {
    font = opentype.loadSync(file);
    fontCache.set(file, font);
  }
  return font;
}

export interface TextSpec {
  text: string;
  sizePx: number;
  semibold?: boolean;
  color: string;
  /** Extra space between letters, as a fraction of the font size. */
  tracking?: number;
  align?: "left" | "centre" | "right";
  /** Lines wrap at this width. Newlines in `text` always start a new line. */
  maxWidth?: number;
}

export interface Rendered {
  input: Buffer;
  width: number;
  height: number;
}

interface Laid {
  glyphs: opentype.Glyph[];
  width: number;
}

/** Glyphs for one line, dropping characters the font lacks so nothing prints as a box. */
function layLine(font: opentype.Font, text: string, size: number, tracking: number): Laid {
  const scale = size / font.unitsPerEm;
  const glyphs = Array.from(text)
    .map((ch) => font.charToGlyph(ch))
    .filter((g) => g.index !== 0);
  let width = 0;
  glyphs.forEach((g, i) => {
    width += (g.advanceWidth ?? 0) * scale;
    if (i > 0) width += font.getKerningValue(glyphs[i - 1], g) * scale;
    if (i < glyphs.length - 1) width += tracking;
  });
  return { glyphs, width };
}

function wrap(font: opentype.Font, text: string, size: number, tracking: number, maxWidth?: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!maxWidth) {
      lines.push(paragraph);
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && layLine(font, candidate, size, tracking).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Renders text in Bodoni Moda as a transparent PNG, sized to fit the text. */
export async function renderText(spec: TextSpec): Promise<Rendered> {
  const font = loadFont(spec.semibold ?? false);
  const size = Math.max(1, spec.sizePx);
  const scale = size / font.unitsPerEm;
  const tracking = (spec.tracking ?? 0) * size;
  const ascender = font.ascender * scale;
  const descender = -font.descender * scale;
  const lineHeight = (ascender + descender) * 1.05;
  const pad = Math.ceil(size * 0.04) + 1;

  const lines = wrap(font, spec.text, size, tracking, spec.maxWidth).map((l) => layLine(font, l, size, tracking));
  const width = Math.max(1, Math.ceil(Math.max(0, ...lines.map((l) => l.width)) + pad * 2));
  const height = Math.max(1, Math.ceil(lineHeight * lines.length + pad * 2));

  let d = "";
  lines.forEach((line, i) => {
    const align = spec.align ?? "left";
    let x = align === "centre" ? (width - line.width) / 2 : align === "right" ? width - pad - line.width : pad;
    const y = pad + ascender + i * lineHeight;
    line.glyphs.forEach((g, j) => {
      if (j > 0) x += font.getKerningValue(line.glyphs[j - 1], g) * scale;
      d += g.getPath(x, y, size).toPathData(2);
      x += (g.advanceWidth ?? 0) * scale + tracking;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${d}" fill="${spec.color}"/></svg>`;
  return { input: await sharp(Buffer.from(svg)).png().toBuffer(), width, height };
}

/** Single-line text that shrinks until it fits `maxWidth`. */
async function renderFitted(spec: TextSpec & { maxWidth: number }): Promise<Rendered> {
  const first = await renderText({ ...spec, maxWidth: undefined });
  if (first.width <= spec.maxWidth) return first;
  return renderText({ ...spec, sizePx: (spec.sizePx * spec.maxWidth) / first.width, maxWidth: undefined });
}

/** A soft shadow under light text, or a soft glow under dark text, so it reads on busy areas. */
async function shadowed(text: Rendered, left: number, top: number, lightText: boolean, blur: number): Promise<OverlayOptions[]> {
  const c = lightText ? 0 : 255;
  const shade = await sharp(text.input)
    .ensureAlpha()
    .linear([0, 0, 0, 0.8], [c, c, c, 0])
    .blur(Math.max(0.3, blur))
    .png()
    .toBuffer();
  const at = { left: Math.max(0, Math.round(left)), top: Math.max(0, Math.round(top)) };
  return [
    { input: shade, ...at },
    { input: text.input, ...at },
  ];
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Average brightness (0–255) of one part of the image. */
async function luminance(image: Buffer, box: Box, imageWidth: number, imageHeight: number): Promise<number> {
  const left = Math.max(0, Math.min(imageWidth - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(imageHeight - 1, Math.round(box.top)));
  const width = Math.max(1, Math.min(imageWidth - left, Math.round(box.width)));
  const height = Math.max(1, Math.min(imageHeight - top, Math.round(box.height)));
  // stats() reads the input image, not the pipeline, so cut the area out first.
  const area = await sharp(image).extract({ left, top, width, height }).toBuffer();
  const [r, g, b] = (await sharp(area).stats()).channels;
  return 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;
}

const isLight = (lum: number) => lum > 165;
const monthYear = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
const dayMonthYear = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function magazineCover(jpeg: Buffer, ctx: OverlayContext): Promise<Buffer> {
  const meta = await sharp(jpeg).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const unit = Math.min(W, H * 0.75);
  const margin = Math.round(W * 0.05);
  const blur = unit * 0.006;

  // Where each piece of text goes; light or dark ink depends on what is underneath it.
  const areas = {
    masthead: { left: 0, top: 0, width: W, height: H * 0.22 },
    left: { left: margin, top: H * 0.3, width: W * 0.42, height: H * 0.12 },
    right: { left: W - margin - W * 0.42, top: H * 0.6, width: W * 0.42, height: H * 0.12 },
    footer: { left: margin, top: H - margin - H * 0.04, width: W * 0.6, height: H * 0.04 },
  };
  const [lightTop, lightLeft, lightRight, lightFooter] = await Promise.all(
    [areas.masthead, areas.left, areas.right, areas.footer].map(async (a) => isLight(await luminance(jpeg, a, W, H))),
  );
  const ink = (light: boolean) => (light ? "#141414" : "#ffffff");

  const random = ctx.random ?? Math.random;
  const title = MASTHEADS[Math.min(MASTHEADS.length - 1, Math.floor(random() * MASTHEADS.length))];
  const event = ctx.eventName || "Open House";

  // A soft band behind the masthead keeps it readable whatever the AI put there.
  const bandHeight = Math.round(H * 0.3);
  const shade = lightTop ? "#ffffff" : "#000000";
  const band = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${bandHeight}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${shade}" stop-opacity="${lightTop ? 0.35 : 0.45}"/>` +
      `<stop offset="1" stop-color="${shade}" stop-opacity="0"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );

  const label = (text: string, light: boolean, align: "left" | "right") =>
    renderFitted({ text: text.toUpperCase(), sizePx: unit * 0.026, semibold: true, color: ink(light), tracking: 0.18, align, maxWidth: Math.round(W * 0.42) });
  const line = (text: string, light: boolean, align: "left" | "right") =>
    renderText({ text, sizePx: unit * 0.056, color: ink(light), align, maxWidth: Math.round(W * 0.42) });

  const [masthead, l1, h1, l2, h2, footer] = await Promise.all([
    renderFitted({ text: title, sizePx: unit * 0.3, color: ink(lightTop), tracking: 0.04, align: "centre", maxWidth: Math.round(W * 0.9) }),
    label(event, lightLeft, "left"),
    line("The Rising\nStars Issue", lightLeft, "left"),
    label("Exclusive", lightRight, "right"),
    line("Behind\nthe lens", lightRight, "right"),
    renderFitted({
      text: `${monthYear(ctx.date)} · SPECIAL EDITION`,
      sizePx: unit * 0.022,
      semibold: true,
      color: ink(lightFooter),
      tracking: 0.16,
      maxWidth: Math.round(W * 0.9),
    }),
  ]);

  const layers: OverlayOptions[] = [{ input: band, left: 0, top: 0 }];
  layers.push(...(await shadowed(masthead, (W - masthead.width) / 2, H * 0.025, !lightTop, blur * 2)));
  layers.push(...(await shadowed(l1, margin, areas.left.top, !lightLeft, blur)));
  layers.push(...(await shadowed(h1, margin, areas.left.top + l1.height, !lightLeft, blur)));
  layers.push(...(await shadowed(l2, W - margin - l2.width, areas.right.top, !lightRight, blur)));
  layers.push(...(await shadowed(h2, W - margin - h2.width, areas.right.top + l2.height, !lightRight, blur)));
  layers.push(...(await shadowed(footer, margin, H - margin - footer.height, !lightFooter, blur)));

  return sharp(jpeg).composite(layers).jpeg({ quality: 92 }).toBuffer();
}

async function polaroidFrame(jpeg: Buffer, ctx: OverlayContext): Promise<Buffer> {
  const meta = await sharp(jpeg).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const border = polaroidBorder(W);
  const caption = [ctx.eventName, dayMonthYear(ctx.date)].filter(Boolean).join(" · ");
  const text = await renderFitted({ text: caption, sizePx: W * 0.045, color: POLAROID_INK, align: "centre", maxWidth: Math.round(W * 0.9) });
  const framed = await sharp(jpeg)
    .extend({ top: border.top, bottom: border.bottom, left: border.side, right: border.side, background: POLAROID_PAPER })
    .toBuffer();
  const left = Math.round(border.side + (W - text.width) / 2);
  const top = Math.round(border.top + H + (border.bottom - text.height) / 2);
  return sharp(framed).composite([{ input: text.input, left, top }]).jpeg({ quality: 92 }).toBuffer();
}

/** Adds the style's text or frame after the AI, in real fonts. Styles without one pass through untouched. */
export async function applyOverlay(kind: StyleDef["overlay"], jpeg: Buffer, ctx: OverlayContext): Promise<Buffer> {
  if (kind === "magazine") return magazineCover(jpeg, ctx);
  if (kind === "polaroid") return polaroidFrame(jpeg, ctx);
  return jpeg;
}
