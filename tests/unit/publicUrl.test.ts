import { afterEach, describe, expect, it } from "vitest";
import { publicBase } from "@/lib/publicUrl";
import { qrSvg } from "@/lib/qr";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("QR links", () => {
  it("uses PUBLIC_URL when it is set", () => {
    process.env.PUBLIC_URL = "https://booth.example.com/";
    expect(publicBase(new Request("http://internal:8080/api/shots"))).toBe("https://booth.example.com");
  });

  it("otherwise uses the address the iPad reached, through Railway's proxy", () => {
    delete process.env.PUBLIC_URL;
    const viaProxy = new Request("http://0.0.0.0:8080/api/shots", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "studio.up.railway.app" },
    });
    expect(publicBase(viaProxy)).toBe("https://studio.up.railway.app");
    expect(publicBase(new Request("http://x/api", { headers: { host: "booth.local:3000" } }))).toBe("https://booth.local:3000");
  });

  it("draws a QR code as SVG", async () => {
    const svg = await qrSvg("https://booth.example.com/p/AAAAAAAAAAAAAAAAAAAAAA");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("#111111");
  });
});
