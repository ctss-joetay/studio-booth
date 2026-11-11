import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { editImage, fakeEditImage, OPENROUTER_IMAGES_URL } from "@/lib/seedream";
import { solidImage } from "../helpers/images";

type Call = { url: string; init: RequestInit };

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { fn, calls };
}

// The shape OpenRouter's Images API returned for Seedream 5.0 Flash in the Task 4 probe.
const okJson = (image: Buffer, cost?: number) =>
  Response.json({
    created: 1790900000,
    data: [{ b64_json: image.toString("base64"), media_type: "image/jpeg" }],
    usage: cost === undefined ? {} : { cost },
  });

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("editImage", () => {
  it("sends the photo and prompt to Seedream through OpenRouter's Images API, keeping the photo's shape", async () => {
    const jpeg = await solidImage(64, 48);
    const { fn, calls } = fakeFetch(() => okJson(jpeg, 0.018));
    await editImage("Instruction: x\n\nRules: y", jpeg, { fetchImpl: fn, apiKey: "sk-test" });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(OPENROUTER_IMAGES_URL);
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer sk-test");
    expect(new Headers(calls[0].init.headers).get("x-title")).toBe("Studio Booth");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      model: "bytedance-seed/seedream-5-0-flash",
      prompt: "Instruction: x\n\nRules: y",
      input_references: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } }],
      resolution: "2K",
      aspect_ratio: "auto",
      provider: { data_collection: "deny" },
    });
  });

  it("uses SEEDREAM_MODEL when set", async () => {
    process.env.SEEDREAM_MODEL = "bytedance-seed/seedream-5-0-pro";
    const jpeg = await solidImage(8, 8);
    const { fn, calls } = fakeFetch(() => okJson(jpeg));
    await editImage("p", jpeg, { fetchImpl: fn });
    expect(JSON.parse(String(calls[0].init.body)).model).toBe("bytedance-seed/seedream-5-0-pro");
  });

  it("returns the decoded image and the reported cost", async () => {
    const png = await solidImage(32, 32, "png", { r: 10, g: 20, b: 30 });
    const { fn } = fakeFetch(() => okJson(png, 0.018));
    const result = await editImage("p", png, { fetchImpl: fn });
    expect(result.image.equals(png)).toBe(true);
    expect(result.costUsd).toBe(0.018);
  });

  it("reports cost as null when OpenRouter doesn't send one", async () => {
    const png = await solidImage(8, 8, "png");
    const { fn } = fakeFetch(() => okJson(png));
    expect((await editImage("p", png, { fetchImpl: fn })).costUsd).toBeNull();
  });


  it.each([
    [429, "busy"],
    [503, "busy"],
    [402, "budget"],
    [401, "auth"],
    [403, "refused"],
    [400, "refused"],
    [500, "upstream"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    const { fn } = fakeFetch(() => Response.json({ error: { code: status, message: "nope" } }, { status }));
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn })).rejects.toMatchObject({ name: "SeedreamError", kind, status });
  });

  it.each([
    [403, "openrouter_key_limit", "budget"],
    [403, "openrouter_workspace_budget", "budget"],
    [403, "openrouter_guardrail_budget", "budget"],
    [402, "openrouter_credits", "budget"],
    [402, "openrouter_in_flight_budget", "busy"],
  ])("maps HTTP %i with limit_source %s to %s (OpenRouter budget errors)", async (status, limitSource, kind) => {
    const { fn } = fakeFetch(() =>
      Response.json({ error: { code: status, message: "Budget limit exceeded", metadata: { limit_source: limitSource } } }, { status }),
    );
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn })).rejects.toMatchObject({ kind, status });
  });

  it("maps an error object inside a 200 response", async () => {
    const { fn } = fakeFetch(() => Response.json({ error: { code: 402, message: "Insufficient credits" } }));
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn })).rejects.toMatchObject({ kind: "budget" });
  });


  it("treats an answer without an image as no_image", async () => {
    const { fn } = fakeFetch(() => Response.json({ created: 1, data: [] }));
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn })).rejects.toMatchObject({ kind: "no_image" });
  });

  it("gives up after the timeout", async () => {
    const { fn } = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn, timeoutMs: 50 })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("treats a network failure as upstream", async () => {
    const { fn } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(editImage("p", Buffer.from("x"), { fetchImpl: fn })).rejects.toMatchObject({ kind: "upstream" });
  });

  it("hands the raw response to onResponse", async () => {
    const png = await solidImage(8, 8, "png");
    const { fn } = fakeFetch(() => okJson(png, 0.01));
    let seen: unknown;
    await editImage("p", png, { fetchImpl: fn, onResponse: (json) => (seen = json) });
    expect(seen).toMatchObject({ usage: { cost: 0.01 } });
  });
});

describe("fake editor", () => {
  it("returns a tinted JPEG of the same size", async () => {
    const out = await fakeEditImage("p", await solidImage(120, 80));
    const meta = await sharp(out.image).metadata();
    expect({ w: meta.width, h: meta.height, f: meta.format }).toEqual({ w: 120, h: 80, f: "jpeg" });
    expect(out.costUsd).toBe(0);
  });
});
