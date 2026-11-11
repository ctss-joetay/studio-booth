import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MASTHEADS, applyOverlay, cleanEventName, polaroidBorder, renderText } from "@/lib/overlays";
import { brightestInBand, pixelAt, solidImage } from "../helpers/images";

const darkGreen = { r: 60, g: 70, b: 60 };

describe("overlays added after the AI", () => {
  it("uses made-up magazine titles only", () => {
    expect(MASTHEADS).toEqual(["ICON", "GLAM", "LUXE", "MUSE", "ÉLAN", "VERVE"]);
  });

  it("Magazine keeps the size and writes a masthead across the top", async () => {
    const src = await solidImage(1200, 1800, "jpeg", darkGreen);
    const out = await applyOverlay("magazine", src, { eventName: "Open House", date: new Date(2026, 10, 14), random: () => 0 });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 1800, "jpeg"]);
    expect(await brightestInBand(src, 0, 0.18)).toBeLessThan(80);
    expect(await brightestInBand(out, 0, 0.18)).toBeGreaterThan(220);
  });

  it("Magazine also puts headlines lower down", async () => {
    const out = await applyOverlay("magazine", await solidImage(1200, 1800, "jpeg", darkGreen), { eventName: "", date: new Date() });
    expect(await brightestInBand(out, 0.3, 1)).toBeGreaterThan(200);
  });

  it("Polaroid adds a white border, thicker at the bottom", async () => {
    const src = await solidImage(1000, 1500, "jpeg", darkGreen);
    const out = await applyOverlay("polaroid", src, { eventName: "Open House", date: new Date(2026, 10, 14) });
    const b = polaroidBorder(1000);
    expect(b).toEqual({ side: 60, top: 60, bottom: 220 });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1000 + 2 * b.side, 1500 + b.top + b.bottom]);
    expect((await pixelAt(out, 5, 5)).r).toBeGreaterThan(240);
    expect((await pixelAt(out, 560, 800)).r).toBeLessThan(80);
  });

  it("awkward event names", async () => {
    expect(cleanEventName("x".repeat(200))).toHaveLength(40);
    expect(cleanEventName("  Open\u0000 House \n")).toBe("Open House");
    expect(cleanEventName("   ")).toBe("");
    expect(cleanEventName(42)).toBe("");
    for (const name of ["R&D <Lab> \"quotes\" 'too'", "Open House 🎓", "x".repeat(200)]) {
      const ctx = { eventName: cleanEventName(name), date: new Date() };
      await expect(applyOverlay("magazine", await solidImage(800, 1200), ctx)).resolves.toBeInstanceOf(Buffer);
      await expect(applyOverlay("polaroid", await solidImage(800, 1200), ctx)).resolves.toBeInstanceOf(Buffer);
    }
  });

  it("works on landscape group photos too", async () => {
    const out = await applyOverlay("magazine", await solidImage(1800, 1200, "jpeg", darkGreen), { eventName: "", date: new Date() });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1800, 1200]);
  });

  it("passes other styles through untouched", async () => {
    const src = await solidImage(10, 10);
    expect(await applyOverlay(null, src, { eventName: "", date: new Date() })).toBe(src);
  });

  it("draws text in the bundled Bodoni Moda, not a fallback font", async () => {
    // Ten capital Is are 387 px wide in Bodoni Moda at 100 px (a fallback sans gives about 263).
    const text = await renderText({ text: "IIIIIIIIII", sizePx: 100, color: "#ffffff" });
    expect(text.width).toBeGreaterThan(380);
    expect(text.width).toBeLessThan(400);
  });

  it("skips characters the font doesn't have instead of drawing boxes", async () => {
    const plain = await renderText({ text: "Open House", sizePx: 50, color: "#ffffff" });
    const withEmoji = await renderText({ text: "Open House🎓", sizePx: 50, color: "#ffffff" });
    expect(withEmoji.width).toBe(plain.width);
  });

  it("picks light or dark text from what is underneath it", async () => {
    // White everywhere except a black strip along the bottom, where the footer goes.
    const W = 1200, H = 1800, strip = Math.round(H * 0.12);
    const src = await sharp({ create: { width: W, height: H, channels: 3, background: "#f7f7f5" } })
      .composite([{ input: { create: { width: W, height: strip, channels: 3, background: "#000000" } }, left: 0, top: H - strip }])
      .jpeg()
      .toBuffer();
    const out = await applyOverlay("magazine", src, { eventName: "", date: new Date() });
    expect(await brightestInBand(out, 0.9, 1)).toBeGreaterThan(200);
  });
});
