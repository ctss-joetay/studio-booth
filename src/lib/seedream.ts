import sharp from "sharp";
import { config } from "./config";

/** OpenRouter's Images API: unlike chat completions it takes aspect_ratio, so edits keep the photo's shape. */
export const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";

export type SeedreamErrorKind = "busy" | "budget" | "auth" | "refused" | "no_image" | "timeout" | "upstream";

export class SeedreamError extends Error {
  constructor(
    public readonly kind: SeedreamErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SeedreamError";
  }
}

export interface EditResult {
  image: Buffer;
  costUsd: number | null;
}

export type EditImageFn = (prompt: string, jpeg: Buffer) => Promise<EditResult>;

export interface EditImageOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  dataCollection?: "deny" | "allow";
  /** For the probe: sees the parsed JSON response before it is checked. */
  onResponse?: (json: unknown) => void;
}

interface OpenRouterResponse {
  error?: { code?: number | string; message?: string; metadata?: { limit_source?: string } };
  data?: { b64_json?: string; media_type?: string }[];
  usage?: { cost?: number };
}

export function buildRequestBody(prompt: string, jpeg: Buffer, model: string, dataCollection: "deny" | "allow") {
  return {
    model,
    prompt,
    input_references: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } }],
    resolution: "2K",
    // "auto" keeps the input photo's aspect ratio (confirmed in the Task 4 probe); a fixed ratio would reframe it.
    aspect_ratio: "auto",
    provider: { data_collection: dataCollection },
  };
}

function errorForStatus(status: number, json: OpenRouterResponse | null): SeedreamError {
  const detail = json?.error?.message ?? `HTTP ${status}`;
  // OpenRouter names the limit that blocked the request; it decides before the status code does
  // (a spent key limit or budget is a 403, a crowded in-flight budget is a transient 402).
  const limitSource = json?.error?.metadata?.limit_source ?? "";
  if (limitSource === "openrouter_in_flight_budget") return new SeedreamError("busy", detail, status);
  if (limitSource === "openrouter_key_limit" || limitSource === "openrouter_credits" || limitSource.endsWith("_budget")) {
    return new SeedreamError("budget", detail, status);
  }
  if (status === 429 || status === 503) return new SeedreamError("busy", detail, status);
  if (status === 402) return new SeedreamError("budget", detail, status);
  if (status === 401) return new SeedreamError("auth", detail, status);
  if (status === 400 || status === 403) return new SeedreamError("refused", detail, status);
  if (status === 408) return new SeedreamError("timeout", detail, status);
  return new SeedreamError("upstream", detail, status);
}

function isAbort(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

export async function editImage(prompt: string, jpeg: Buffer, opts: EditImageOptions = {}): Promise<EditResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = buildRequestBody(prompt, jpeg, opts.model ?? config.seedreamModel, opts.dataCollection ?? "deny");

  let json: OpenRouterResponse | null;
  let status: number;
  try {
    const res = await fetchImpl(OPENROUTER_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey ?? config.openrouterApiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Studio Booth",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    status = res.status;
    json = (await res.json().catch(() => null)) as OpenRouterResponse | null;
  } catch (error) {
    if (isAbort(error)) throw new SeedreamError("timeout", "OpenRouter did not answer in time");
    throw new SeedreamError("upstream", `Network error: ${(error as Error).message}`);
  }

  opts.onResponse?.(json);
  if (status < 200 || status >= 300) throw errorForStatus(status, json);
  if (json?.error) throw errorForStatus(Number(json.error.code) || 502, json);

  const b64 = json?.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || b64.length === 0) throw new SeedreamError("no_image", "The model returned no image");

  const image = Buffer.from(b64, "base64");
  const cost = json?.usage?.cost;
  return { image, costUsd: typeof cost === "number" ? cost : null };
}

/** Used when SEEDREAM_FAKE=1 (tests, e2e): a quick warm tint instead of a real AI edit. */
export const fakeEditImage: EditImageFn = async (_prompt, jpeg) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = await sharp(jpeg).tint({ r: 255, g: 190, b: 120 }).jpeg().toBuffer();
  return { image, costUsd: 0 };
};
