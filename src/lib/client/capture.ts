import type { PhotoShape, Rotation } from "./settings";

export interface Crop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function rotatedSize(w: number, h: number, rotation: Rotation): { w: number; h: number } {
  return rotation === 90 || rotation === 270 ? { w: h, h: w } : { w, h };
}

/** Which way round the camera's own picture is (square counts as landscape). */
export function pictureShape(w: number, h: number): PhotoShape {
  return h > w ? "portrait" : "landscape";
}

/** The largest centred 3:2 area for a landscape photo, or 2:3 area for a portrait one, of any frame. */
export function cropRect(w: number, h: number, shape: PhotoShape): Crop {
  const target = shape === "portrait" ? 2 / 3 : 3 / 2;
  if (w / h > target) {
    const sw = Math.round(h * target);
    return { sx: Math.round((w - sw) / 2), sy: 0, sw, sh: h };
  }
  const sh = Math.round(w / target);
  return { sx: 0, sy: Math.round((h - sh) / 2), sw: w, sh };
}

/** The photo exactly as the guests saw it framed, upright, in the chosen shape and never mirrored, as a JPEG. */
export function captureFrame(video: HTMLVideoElement, rotation: Rotation, shape: PhotoShape, quality = 0.92): Promise<Blob> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const { w, h } = rotatedSize(vw, vh, rotation);
  const crop = cropRect(w, h, shape);
  const canvas = document.createElement("canvas");
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  ctx.translate(-crop.sx, -crop.sy);
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Capture failed"))), "image/jpeg", quality),
  );
}
