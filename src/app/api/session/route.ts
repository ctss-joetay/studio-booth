import { AppError } from "@/lib/errors";
import { pinBlocked, recordPinFailure } from "@/lib/guards";
import { clientIp, handle, readJson } from "@/lib/http";
import { boothSession, isUnlocked, pinFingerprint, pinMatches } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = handle(async () => Response.json({ unlocked: await isUnlocked() }));

export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  if (pinBlocked(ip)) throw new AppError(429, "Too many tries. Wait a few minutes.");
  const { pin } = await readJson(req);
  if (!pinMatches(pin)) {
    recordPinFailure(ip);
    throw new AppError(401, "That PIN isn't right.");
  }
  const session = await boothSession();
  session.pin = pinFingerprint();
  await session.save();
  return Response.json({ unlocked: true });
});

export const DELETE = handle(async () => {
  (await boothSession()).destroy();
  return Response.json({ unlocked: false });
});
