import { describe, expect, it } from "vitest";
import { cropRect, pictureShape, rotatedSize } from "@/lib/client/capture";
import { DEFAULT_SETTINGS, ROTATION_CHOICES, SHAPE_CHOICES, loadSettings, parseSettings, saveSettings } from "@/lib/client/settings";
import { STYLES } from "@/lib/styles";

describe("framing the camera", () => {
  it("cuts the largest centred 3:2 area for landscape photos, whatever shape the camera sends", () => {
    expect(cropRect(1920, 1080, "landscape")).toEqual({ sx: 150, sy: 0, sw: 1620, sh: 1080 });
    expect(cropRect(1080, 1920, "landscape")).toEqual({ sx: 0, sy: 600, sw: 1080, sh: 720 });
    expect(cropRect(1500, 1000, "landscape")).toEqual({ sx: 0, sy: 0, sw: 1500, sh: 1000 });
    expect(cropRect(1000, 1000, "landscape")).toEqual({ sx: 0, sy: 167, sw: 1000, sh: 667 });
  });

  it("cuts the largest centred 2:3 area for portrait photos, whatever shape the camera sends", () => {
    expect(cropRect(1080, 1920, "portrait")).toEqual({ sx: 0, sy: 150, sw: 1080, sh: 1620 });
    expect(cropRect(1920, 1080, "portrait")).toEqual({ sx: 600, sy: 0, sw: 720, sh: 1080 });
    expect(cropRect(1000, 1500, "portrait")).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 1500 });
    expect(cropRect(1000, 1000, "portrait")).toEqual({ sx: 167, sy: 0, sw: 667, sh: 1000 });
  });

  it("tells whether the camera itself sends portrait or landscape pictures", () => {
    expect(pictureShape(1920, 1080)).toBe("landscape");
    expect(pictureShape(1080, 1920)).toBe("portrait");
    expect(pictureShape(1000, 1000)).toBe("landscape");
  });

  it("swaps width and height for a camera mounted sideways", () => {
    expect(rotatedSize(1920, 1080, 90)).toEqual({ w: 1080, h: 1920 });
    expect(rotatedSize(1920, 1080, 270)).toEqual({ w: 1080, h: 1920 });
    expect(rotatedSize(1920, 1080, 180)).toEqual({ w: 1920, h: 1080 });
    expect(rotatedSize(1920, 1080, 0)).toEqual({ w: 1920, h: 1080 });
  });
});

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

describe("booth settings on the iPad", () => {
  it("starts with landscape photos, a 10-second timer, a mirrored view and every style", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      cameraId: null,
      rotation: 0,
      shape: "landscape",
      mirror: true,
      countdown: 10,
      eventName: "",
      enabledStyles: STYLES.map((s) => s.id),
    });
  });

  it("falls back to the defaults for anything missing or garbled", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nonsense")).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStorage({ "studio-booth-settings": "{not json" }))).toEqual(DEFAULT_SETTINGS);
    const odd = parseSettings({ rotation: 45, shape: "round", mirror: "yes", countdown: 0, cameraId: 7, enabledStyles: ["vogue"] });
    expect(odd).toEqual({ ...DEFAULT_SETTINGS, countdown: 1 });
  });

  it("keeps a portrait photo shape", () => {
    expect(parseSettings({ shape: "portrait" }).shape).toBe("portrait");
    expect(parseSettings({ shape: "landscape" }).shape).toBe("landscape");
  });

  it("keeps the countdown between 1 and 30 seconds", () => {
    expect(parseSettings({ countdown: 99 }).countdown).toBe(30);
    expect(parseSettings({ countdown: 7.6 }).countdown).toBe(8);
  });

  it("keeps only known styles, in the booth's order, and never none", () => {
    expect(parseSettings({ enabledStyles: ["neon", "vogue", "bw"] }).enabledStyles).toEqual(["bw", "neon"]);
    expect(parseSettings({ enabledStyles: [] }).enabledStyles).toEqual(STYLES.map((s) => s.id));
  });

  it("cleans the event name", () => {
    expect(parseSettings({ eventName: "  Open\n House  " + "x".repeat(60) }).eventName).toHaveLength(40);
  });

  it("saves and loads", () => {
    const storage = memoryStorage();
    const mine = {
      ...DEFAULT_SETTINGS,
      cameraId: "canon-1",
      rotation: 90 as const,
      shape: "portrait" as const,
      countdown: 5,
      eventName: "Open House",
    };
    saveSettings(mine, storage);
    expect(loadSettings(storage)).toEqual(mine);
  });

  it("survives a browser that refuses storage", () => {
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error("denied");
    };
    broken.setItem = () => {
      throw new Error("denied");
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
  });
});

describe("photo shape choices", () => {
  it("offer landscape for groups first and portrait for one or two people", () => {
    expect(SHAPE_CHOICES.map((c) => c.value)).toEqual(["landscape", "portrait"]);
    expect(SHAPE_CHOICES[0].label).toMatch(/landscape.*groups/i);
    expect(SHAPE_CHOICES[1].label).toMatch(/portrait.*1–2 people/i);
  });
});

describe("camera mounting choices", () => {
  it("only say how the camera sits, because the photo shape is chosen separately", () => {
    const label = (r: number) => ROTATION_CHOICES.find((c) => c.value === r)!.label;
    expect(ROTATION_CHOICES.map((c) => c.value).sort()).toEqual([0, 180, 270, 90].sort());
    expect(label(0)).toMatch(/upright/i);
    expect(label(0)).toMatch(/phones and iPads/i);
    expect(label(90)).toMatch(/on its side/i);
    expect(label(270)).toMatch(/on its side/i);
    for (const choice of ROTATION_CHOICES) expect(choice.label).not.toMatch(/landscape|portrait/i);
  });
});
