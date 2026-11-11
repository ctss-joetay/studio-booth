import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** The bundled Bodoni Moda (OFL) used by the screens and by the Magazine and Polaroid overlays. */
export const FONT_REGULAR = path.join(process.cwd(), "public", "fonts", "BodoniModa_400Regular.ttf");
export const FONT_SEMIBOLD = path.join(process.cwd(), "public", "fonts", "BodoniModa_600SemiBold.ttf");

/** Settings from environment variables. Getters, so tests can change env before first use. */
export const config = {
  get openrouterApiKey(): string {
    return process.env.OPENROUTER_API_KEY || "";
  },
  /** No key means rehearsal mode: the "AI" tints the photo instead of calling OpenRouter. */
  get seedreamFake(): boolean {
    return process.env.SEEDREAM_FAKE === "1" || !this.openrouterApiKey;
  },
  get boothPin(): string {
    return required("BOOTH_PIN");
  },
  get sessionSecret(): string {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return secret;
  },
  get seedreamModel(): string {
    return process.env.SEEDREAM_MODEL || "bytedance-seed/seedream-5-0-flash";
  },
  get dataDir(): string {
    return process.env.DATA_DIR || "/data";
  },
  get shotsDir(): string {
    return path.join(this.dataDir, "shots");
  },
  get publicUrl(): string {
    return (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
  },
  /** AI calls allowed per rolling hour, so a stuck button or a crowd can't run up the bill. */
  get maxShotsPerHour(): number {
    const n = Number(process.env.MAX_SHOTS_PER_HOUR);
    return Number.isInteger(n) && n > 0 ? n : 150;
  },
  /** Secure cookies in production, except when PUBLIC_URL is plain http (local e2e runs). */
  get secureCookies(): boolean {
    return process.env.NODE_ENV === "production" && !this.publicUrl.startsWith("http://");
  },
};
