import sharp from "sharp";
import { AppError } from "./errors";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MODEL_MAX_SIDE = 2048;

const UNREADABLE = "That photo couldn't be read. Try again.";

/** Truncated files fail; minor warnings that real camera frames carry do not. */
const load = (data: Buffer) => sharp(data, { failOn: "truncated" });

/** Confirms the upload is a complete JPEG, PNG or WebP under 15 MB. */
export async function inspectPhoto(data: Buffer): Promise<{ width: number; height: number }> {
  if (data.length > MAX_UPLOAD_BYTES) throw new AppError(413, UNREADABLE);
  try {
    const meta = await load(data).metadata();
    if (meta.format !== "jpeg" && meta.format !== "png" && meta.format !== "webp") throw new Error("format");
    if (!meta.width || !meta.height) throw new Error("size");
    // Decode the whole image so a half-uploaded file is caught before the AI is paid for.
    await load(data).resize(64, 64, { fit: "inside" }).toBuffer();
    return { width: meta.width, height: meta.height };
  } catch {
    throw new AppError(415, UNREADABLE);
  }
}

/** What the model receives: upright, at most 2048 px, JPEG. */
export async function prepareForModel(data: Buffer): Promise<Buffer> {
  return load(data)
    .rotate()
    .resize({ width: MODEL_MAX_SIDE, height: MODEL_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function toJpeg(data: Buffer, quality = 92): Promise<Buffer> {
  return load(data).rotate().flatten({ background: "#ffffff" }).jpeg({ quality }).toBuffer();
}
