import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { getEditor, setEditorForTests } from "@/lib/editor";
import { MAX_UPLOAD_BYTES, MODEL_MAX_SIDE, inspectPhoto, prepareForModel, toJpeg } from "@/lib/images";
import { fakeEditImage, type EditImageFn } from "@/lib/seedream";
import { noisyJpeg, solidImage } from "../helpers/images";

afterEach(() => setEditorForTests(null));

describe("photos from the booth camera", () => {
  it("limits uploads to 15 MB and the model's input to 2048 px", () => {
    expect(MAX_UPLOAD_BYTES).toBe(15 * 1024 * 1024);
    expect(MODEL_MAX_SIDE).toBe(2048);
  });

  it("shrinks a large photo to 2048 px on its longest side, as JPEG", async () => {
    const out = await prepareForModel(await noisyJpeg(4000, 3000));
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([2048, 1536, "jpeg"]);
  });

  it("turns an EXIF-rotated portrait upright", async () => {
    // Stored 300×200 with orientation 6 (rotate 90° clockwise): it shows as a 200×300 portrait.
    const rotated = await sharp(await solidImage(300, 200)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const meta = await sharp(await prepareForModel(rotated)).metadata();
    expect([meta.width, meta.height]).toEqual([200, 300]);
  });

  it("flattens a PNG with transparency into a JPEG", async () => {
    const png = await sharp({ create: { width: 40, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    expect((await sharp(await toJpeg(png)).metadata()).format).toBe("jpeg");
  });

  it("refuses files over 15 MB and things that aren't photos", async () => {
    await expect(inspectPhoto(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toMatchObject({ status: 413 });
    await expect(inspectPhoto(Buffer.from("not a photo at all"))).rejects.toMatchObject({
      status: 415,
      message: "That photo couldn't be read. Try again.",
    });
    expect(await inspectPhoto(await solidImage(64, 48))).toEqual({ width: 64, height: 48 });
  });
});

describe("choosing the editor", () => {
  it("uses the fake editor in fake mode", () => {
    process.env.SEEDREAM_FAKE = "1";
    expect(getEditor()).toBe(fakeEditImage);
  });

  it("lets tests put their own editor in", () => {
    const mine: EditImageFn = async (_p, jpeg) => ({ image: jpeg, costUsd: 0 });
    setEditorForTests(mine);
    expect(getEditor()).toBe(mine);
  });
});
