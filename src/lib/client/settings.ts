import { STYLES, type StyleId } from "@/lib/styles";
import { cleanEventName } from "@/lib/text";

export type Rotation = 0 | 90 | 180 | 270;
export type PhotoShape = "landscape" | "portrait";

/** Set by student helpers in Setup; kept on the iPad, because they belong to that device and its camera. */
export interface BoothSettings {
  cameraId: string | null;
  rotation: Rotation;
  /** Every photo comes out this shape, whatever shape of picture the camera sends. */
  shape: PhotoShape;
  mirror: boolean;
  countdown: number;
  eventName: string;
  enabledStyles: StyleId[];
}

export const SETTINGS_KEY = "studio-booth-settings";

export const SHAPE_CHOICES: { value: PhotoShape; label: string }[] = [
  { value: "landscape", label: "Landscape (3:2) — best for groups" },
  { value: "portrait", label: "Portrait (2:3) — best for 1–2 people" },
];

/**
 * How the camera sits on its stand, so its picture can be turned upright. Phones and iPads turn their own pictures,
 * so they stay upright; a Canon mounted on its side doesn't.
 */
export const ROTATION_CHOICES: { value: Rotation; label: string }[] = [
  { value: 0, label: "Upright (phones and iPads always use this)" },
  { value: 90, label: "On its side, turned right" },
  { value: 270, label: "On its side, turned left" },
  { value: 180, label: "Upside down" },
];

export const DEFAULT_SETTINGS: BoothSettings = {
  cameraId: null,
  rotation: 0,
  shape: "landscape",
  mirror: true,
  countdown: 10,
  eventName: "",
  enabledStyles: STYLES.map((s) => s.id),
};

export function parseSettings(raw: unknown): BoothSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rotation = ([0, 90, 180, 270] as const).find((r) => r === o.rotation) ?? DEFAULT_SETTINGS.rotation;
  const countdown =
    typeof o.countdown === "number" && Number.isFinite(o.countdown)
      ? Math.min(30, Math.max(1, Math.round(o.countdown)))
      : DEFAULT_SETTINGS.countdown;
  const wanted = Array.isArray(o.enabledStyles) ? o.enabledStyles : [];
  const enabledStyles = STYLES.map((s) => s.id).filter((id) => wanted.includes(id));
  return {
    cameraId: typeof o.cameraId === "string" && o.cameraId ? o.cameraId : null,
    rotation,
    shape: o.shape === "portrait" ? "portrait" : "landscape",
    mirror: typeof o.mirror === "boolean" ? o.mirror : DEFAULT_SETTINGS.mirror,
    countdown,
    eventName: cleanEventName(o.eventName),
    enabledStyles: enabledStyles.length ? enabledStyles : DEFAULT_SETTINGS.enabledStyles,
  };
}

const browserStorage = (): Storage | undefined => (typeof window === "undefined" ? undefined : window.localStorage);

export function loadSettings(storage: Storage | undefined = browserStorage()): BoothSettings {
  try {
    return parseSettings(JSON.parse(storage?.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BoothSettings, storage: Storage | undefined = browserStorage()): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or blocked storage: the booth still works with this session's settings.
  }
}
