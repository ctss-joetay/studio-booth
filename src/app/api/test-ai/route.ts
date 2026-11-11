import sharp from "sharp";
import { config } from "@/lib/config";
import { getEditor } from "@/lib/editor";
import { handle } from "@/lib/http";
import { SeedreamError } from "@/lib/seedream";
import { requireBooth } from "@/lib/session";
import { buildPrompt } from "@/lib/styles";

export const dynamic = "force-dynamic";

/** Setup's "Test the AI": one real request on a plain test image. Nothing is stored. */
export const POST = handle(async (_req: Request) => {
  await requireBooth();
  const image = await sharp({ create: { width: 512, height: 640, channels: 3, background: { r: 138, g: 141, b: 144 } } })
    .jpeg()
    .toBuffer();
  const mode = config.seedreamFake ? "fake" : "real";
  const started = Date.now();
  try {
    await getEditor()(buildPrompt("professional", "grey", "half"), image);
    return Response.json({ ok: true, mode, seconds: (Date.now() - started) / 1000 });
  } catch (error) {
    const message =
      error instanceof SeedreamError ? `${error.kind}${error.status ? ` (${error.status})` : ""}: ${error.message}` : String(error);
    return Response.json({ ok: false, mode, seconds: (Date.now() - started) / 1000, error: message });
  }
});
