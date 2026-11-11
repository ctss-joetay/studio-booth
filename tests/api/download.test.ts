import { mkdir, rm } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as guestImage } from "@/app/api/p/[token]/image/route";
import { config } from "@/lib/config";
import { getShot, saveShot } from "@/lib/shots";
import { ctx } from "../helpers/api";
import { solidImage } from "../helpers/images";

beforeEach(async () => {
  await rm(config.shotsDir, { recursive: true, force: true });
  await mkdir(config.shotsDir, { recursive: true });
});

const fetchImage = (token: string, query = "") => guestImage(new Request(`http://booth.test/api/p/${token}/image${query}`), ctx({ token }));

describe("guest download", () => {
  it("serves the photo to a guest's phone without a PIN, and starts the five-minute clock", async () => {
    const { token } = await saveShot(await solidImage(60, 90), "film");
    const res = await fetchImage(token);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toBeNull();
    expect((await getShot(token))!.downloadedAt).not.toBeNull();
  });

  it("offers a dated file name when asked to download", async () => {
    const created = new Date();
    const { token } = await saveShot(await solidImage(60, 90), "film", created.getTime());
    const res = await fetchImage(token, "?download=1");
    const day = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
    expect(res.headers.get("content-disposition")).toBe(`attachment; filename="studio-portrait-${day}.jpg"`);
  });

  it("expired token", async () => {
    const { token } = await saveShot(await solidImage(60, 90), "film", Date.now() - 3_600_001);
    const res = await fetchImage(token);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "This photo has been deleted" });
  });

  it("treats a made-up or malformed token the same way", async () => {
    expect((await fetchImage("AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404);
    expect((await fetchImage("../../etc/passwd")).status).toBe(404);
  });
});
