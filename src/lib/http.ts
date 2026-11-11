import { AppError } from "./errors";

/** Wraps a route handler: AppError → { error, detail? } with its status; anything else → 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        const body = error.detail ? { error: error.message, detail: error.detail } : { error: error.message };
        return Response.json(body, { status: error.status });
      }
      console.error("[api] unexpected error", error);
      return Response.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/** The caller's address. Railway's edge sets X-Real-IP to the client IP. */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await req.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
