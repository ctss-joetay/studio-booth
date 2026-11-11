import { handle } from "@/lib/http";
import { requireBooth } from "@/lib/session";
import { deleteShot } from "@/lib/shots";

export const dynamic = "force-dynamic";

/** Retake: the previous photo is deleted straight away. */
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  await requireBooth();
  await deleteShot((await params).token);
  return new Response(null, { status: 204 });
});
