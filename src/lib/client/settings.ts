import { STYLES, type StyleId } from "@/lib/styles";
import { cleanEventName } from "@/lib/text";

export type Rotation = 0 | 90 | 180 | 270;

/** Set by student helpers in Setup; kept on the iPad, because they belong to that device and its camera. */
export interface BoothSettings {
  cameraId: string | null;
  rotation: Rotation;
  mirror: boolean;
  countdown: number;
  eventName: string;
  enabledStyles: StyleId[];
}

export const SETTINGS_KEY = "studio-booth-settings";

/**
 * How the camera sits on its stand. A camera standing normally gives landscape photos (best for groups); turned on
 * its side it gives portrait photos (best for one or two people).
 */
export const ROTATION_CHOICES: { value: Rotation; label: string }[] = [
  { value: 0, label: "Standing normally — landscape photos, best for groups" },
  { value: 90, label: "On its side, turned right — portrait photos, best for 1–2 people" },
  { value: 270, label: "On its side, turned left — portrait photos, best for 1–2 people" },
  { value: 180, label: "Upside down — landscape photos" },
];

export const DEFAULT_SETTINGS: BoothSettings = {
  cameraId: null,
  rotation: 0,
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
