import { describe, expect, it } from "vitest";
import { BACKDROPS, IDENTITY_LOCK, PEOPLE_RULE, REALISM, STYLES, buildPrompt, getStyle, isBackdropId, isFraming, isStyleId } from "@/lib/styles";

describe("styles and prompts", () => {
  it("has the ten styles in order", () => {
    expect(STYLES.map((s) => s.name)).toEqual([
      "Professional shoot",
      "Black and White",
      "Magazine",
      "Kawaii Photo Booth",
      "Warm Natural Light",
      "Film",
      "Old Hollywood",
      "Neon Lights",
      "Cinematic",
      "Polaroid",
    ]);
    expect(new Set(STYLES.map((s) => s.id)).size).toBe(10);
  });

  it("has the four backdrops", () => {
    expect(BACKDROPS.map((b) => [b.id, b.hex])).toEqual([
      ["grey", "#8a8d90"],
      ["green", "#4f5e4c"],
      ["black", "#0b0b0b"],
      ["white", "#f7f7f5"],
    ]);
  });

  it("every prompt keeps faces, people and outfits, and stays realistic", () => {
    for (const s of STYLES)
      for (const b of BACKDROPS)
        for (const f of ["half", "full"] as const) {
          const p = buildPrompt(s.id, b.id, f);
          expect(p.startsWith(IDENTITY_LOCK)).toBe(true);
          expect(p).toContain(PEOPLE_RULE);
          expect(p.endsWith(REALISM)).toBe(true);
          expect(p).toContain("Keep the original camera angle and framing");
          expect(p).toMatch(/do not zoom/i);
        }
    expect(PEOPLE_RULE).toContain("Do not add or remove anyone");
    expect(PEOPLE_RULE).toContain("exactly the same outfits");
    expect(IDENTITY_LOCK).toMatch(/Do not beautify, slim, smooth, de-age or swap any face/);
    expect(REALISM).toContain("No text, logos or watermarks");
  });

  it("puts the chosen backdrop in, except for Kawaii's own pastel one", () => {
    expect(buildPrompt("professional", "green", "full")).toContain(BACKDROPS[1].prompt);
    const k = buildPrompt("kawaii", "black", "half");
    for (const b of BACKDROPS) expect(k).not.toContain(b.prompt);
    expect(k).toMatch(/pastel/);
    expect(getStyle("kawaii").usesBackdrop).toBe(false);
    expect(STYLES.filter((s) => !s.usesBackdrop).map((s) => s.id)).toEqual(["kawaii"]);
  });

  it("frames half body waist up and full body head to toe", () => {
    expect(buildPrompt("film", "grey", "half")).toContain("waist up");
    expect(buildPrompt("film", "grey", "full")).toContain("head to toe");
    expect(buildPrompt("film", "grey", "half")).not.toContain("head to toe");
  });

  it("only Magazine and Polaroid get overlays", () => {
    expect(STYLES.filter((s) => s.overlay).map((s) => [s.id, s.overlay])).toEqual([
      ["magazine", "magazine"],
      ["polaroid", "polaroid"],
    ]);
  });

  it("Magazine leaves room above the heads for the title", () => {
    expect(getStyle("magazine").prompt).toMatch(/space above/);
  });

  it("keeps taglines short enough for a tile", () => {
    for (const s of STYLES) expect(s.tagline.length).toBeLessThanOrEqual(32);
  });

  it("leaves no blanks, first person or run-together sentences", () => {
    for (const s of STYLES)
      for (const t of [s.prompt, IDENTITY_LOCK, PEOPLE_RULE, REALISM, ...BACKDROPS.map((b) => b.prompt)]) {
        expect(t).not.toMatch(/[[\]]|\bmy\b/i);
        expect(t).not.toMatch(/[.;:][A-Za-z]/);
      }
  });

  it("recognises valid choices only", () => {
    expect(isStyleId("neon")).toBe(true);
    expect(isStyleId("vogue")).toBe(false);
    expect(isBackdropId("green")).toBe(true);
    expect(isBackdropId("red")).toBe(false);
    expect(isFraming("full")).toBe(true);
    expect(isFraming("knees")).toBe(false);
    expect(() => getStyle("vogue" as never)).toThrow("Unknown style");
  });
});
