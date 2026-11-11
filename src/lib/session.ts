import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { config } from "./config";
import { AppError } from "./errors";

export interface BoothSession {
  /** Fingerprint of BOOTH_PIN when this device was unlocked; changing the PIN locks every device. */
  pin?: string;
}

const TWELVE_HOURS = 60 * 60 * 12;

function options(): SessionOptions {
  return {
    cookieName: "sb_booth",
    password: config.sessionSecret,
    ttl: TWELVE_HOURS,
    cookieOptions: { httpOnly: true, secure: config.secureCookies, sameSite: "lax", path: "/", maxAge: TWELVE_HOURS },
  };
}

export async function boothSession() {
  return getIronSession<BoothSession>(await cookies(), options());
}

export function pinFingerprint(): string {
  return createHash("sha256").update(`booth:${config.boothPin}`).digest("hex").slice(0, 16);
}

export function pinMatches(pin: unknown): boolean {
  if (typeof pin !== "string") return false;
  const a = createHash("sha256").update(pin).digest();
  const b = createHash("sha256").update(config.boothPin).digest();
  return timingSafeEqual(a, b);
}

export async function isUnlocked(): Promise<boolean> {
  return (await boothSession()).pin === pinFingerprint();
}

export async function requireBooth(): Promise<void> {
  if (!(await isUnlocked())) throw new AppError(401, "Enter the booth PIN.");
}
