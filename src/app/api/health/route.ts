import { access, constants, mkdir } from "node:fs/promises";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let storage = false;
  try {
    await mkdir(config.shotsDir, { recursive: true });
    await access(config.shotsDir, constants.W_OK);
    storage = true;
  } catch {
    storage = false;
  }
  return Response.json({ ok: storage, storage }, { status: storage ? 200 : 503 });
}
