import sharp from "sharp";

export type Rgb = { r: number; g: number; b: number };

export function solidImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp" | "tiff" = "jpeg",
  color: Rgb = { r: 255, g: 255, b: 255 },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).toFormat(format).toBuffer();
}

export function noisyJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 30 } } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function pixelAt(image: Buffer, x: number, y: number): Promise<Rgb> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

export async function sizeOf(image: Buffer): Promise<{ width: number; height: number; format: string }> {
  const meta = await sharp(image).metadata();
  return { width: meta.width!, height: meta.height!, format: meta.format! };
}

export const isRed = (p: Rgb) => p.r > 150 && p.g < 120 && p.b < 120;
export const isWhite = (p: Rgb) => p.r > 230 && p.g > 230 && p.b > 230;
