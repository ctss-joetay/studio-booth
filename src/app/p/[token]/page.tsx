import type { Metadata } from "next";
import { AI_NOTICE } from "@/lib/copy";
import { SaveButton } from "@/components/SaveButton";
import { getShot } from "@/lib/shots";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your portrait · The Studio",
  robots: { index: false, follow: false },
};

/** What a guest's phone opens from the QR code. */
export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shot = await getShot(token);

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-5 bg-noir px-5 pb-10 pt-8 select-text">
      <p className="kicker">THE STUDIO</p>
      {shot ? (
        <>
          <h1 className="font-display text-4xl">Your portrait</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/p/${token}/image`}
            alt="Your studio portrait"
            className="w-full shadow-[0_10px_40px_rgba(0,0,0,0.6)] [-webkit-touch-callout:default]"
          />
          <SaveButton token={token} />
          <p className="text-center text-sm text-muted">or press and hold the photo to save it</p>
          <p className="text-center text-xs text-muted">{AI_NOTICE}</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">This photo has been deleted</h1>
          <p className="text-muted">Photos are removed soon after download and always within 1 hour.</p>
        </>
      )}
    </main>
  );
}
