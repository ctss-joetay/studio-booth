import { AppError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { markDownloaded, readShotImage } from "@/lib/shots";

export const dynamic = "force-dynamic";

const day = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** The photo for a guest's phone. The first request starts the five-minute countdown to deletion. */
export const GET = handle(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const meta = await markDownloaded(token);
  if (!meta) throw new AppError(404, "This photo has been deleted");
  const headers: Record<string, string> = { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" };
  if (new URL(req.url).searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="studio-portrait-${day(meta.createdAt)}.jpg"`;
  }
  return new Response(new Uint8Array(await readShotImage(token)), { headers });
});
