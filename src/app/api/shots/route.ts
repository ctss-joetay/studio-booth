import { aiError } from "@/lib/aiErrors";
import { getEditor } from "@/lib/editor";
import { AppError } from "@/lib/errors";
import { startShot } from "@/lib/guards";
import { handle } from "@/lib/http";
import { inspectPhoto, prepareForModel, toJpeg } from "@/lib/images";
import { applyOverlay, cleanEventName } from "@/lib/overlays";
import { publicBase } from "@/lib/publicUrl";
import { qrSvg } from "@/lib/qr";
import { requireBooth } from "@/lib/session";
import { deleteAt, saveShot } from "@/lib/shots";
import { buildPrompt, getStyle, isBackdropId, isFraming, isStyleId } from "@/lib/styles";

export const dynamic = "force-dynamic";

const NO_PHOTO = "No photo arrived. Try again.";

export const POST = handle(async (req: Request) => {
  await requireBooth();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError(400, NO_PHOTO);
  }
  const style = form.get("style");
  const backdrop = form.get("backdrop");
  const framing = form.get("framing");
  if (!isStyleId(style)) throw new AppError(400, "Choose a style.");
  if (!isBackdropId(backdrop)) throw new AppError(400, "Choose a backdrop.");
  if (!isFraming(framing)) throw new AppError(400, "Choose half or full body.");
  const photo = form.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) throw new AppError(400, NO_PHOTO);
  const original = Buffer.from(await photo.arrayBuffer());
  await inspectPhoto(original);

  const slot = startShot();
  if (slot === "busy") throw new AppError(409, "Still developing the last photo.");
  if (slot === "hourly") throw new AppError(429, "The booth is taking a short breather. Try again in a few minutes.");
  try {
    const started = Date.now();
    const prepared = await prepareForModel(original);
    let result;
    try {
      result = await getEditor()(buildPrompt(style, backdrop, framing), prepared);
    } catch (error) {
      throw aiError(error);
    }
    const finished = await applyOverlay(getStyle(style).overlay, await toJpeg(result.image), {
      eventName: cleanEventName(form.get("eventName")),
      date: new Date(),
    });
    const meta = await saveShot(finished, style);
    const cost = result.costUsd === null ? "?" : result.costUsd.toFixed(3);
    console.log(`[shot] ${style}/${backdrop}/${framing} in ${((Date.now() - started) / 1000).toFixed(1)} s, $${cost}`);
    const downloadUrl = `${publicBase(req)}/p/${meta.token}`;
    return Response.json({
      token: meta.token,
      imageUrl: `/api/shots/${meta.token}/image`,
      downloadUrl,
      qrSvg: await qrSvg(downloadUrl),
      deleteAt: deleteAt(meta),
    });
  } finally {
    slot.release();
  }
});
