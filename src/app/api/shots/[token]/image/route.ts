import { AppError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { requireBooth } from "@/lib/session";
import { getShot, readShotImage } from "@/lib/shots";

export const dynamic = "force-dynamic";

/** The finished photo for the booth's own screen. It does not count as a guest download. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  await requireBooth();
  const { token } = await params;
  if (!(await getShot(token))) throw new AppError(404, "This photo has been deleted");
  return new Response(new Uint8Array(await readShotImage(token)), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
  });
});
