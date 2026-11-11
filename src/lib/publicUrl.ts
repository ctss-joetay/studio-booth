import { config } from "./config";

/** The address guests' phones use: PUBLIC_URL, or the one the iPad reached through Railway's proxy. */
export function publicBase(req: Request): string {
  if (config.publicUrl) return config.publicUrl;
  const first = (value: string | null) => value?.split(",")[0].trim() || "";
  const proto = first(req.headers.get("x-forwarded-proto")) || "https";
  const host = first(req.headers.get("x-forwarded-host")) || req.headers.get("host") || new URL(req.url).host;
  return `${proto}://${host}`;
}
