"use client";

import { IDLE_MS } from "./ResultScreen";
import { useIdle } from "./useIdle";

/** A photo that didn't develop: a plain message for guests and a small line for student helpers. */
export function ErrorScreen({ message, detail, onRetry, onStartOver }: { message: string; detail?: string; onRetry: () => void; onStartOver: () => void }) {
  useIdle(IDLE_MS, onStartOver);
  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-noir px-6 text-center">
      <p className="kicker">THE STUDIO</p>
      <h2 className="font-display text-4xl">That one didn&apos;t develop</h2>
      <p className="max-w-md text-ivory">{message}</p>
      {detail && <p className="max-w-md text-xs text-muted">{detail}</p>}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onStartOver} className="rounded-[3px] border border-line px-6 py-3 tracking-[0.08em]">
          Start over
        </button>
        <button type="button" onClick={onRetry} className="rounded-[3px] bg-gold px-6 py-3 font-semibold tracking-[0.08em] text-noir">
          Try again
        </button>
      </div>
    </div>
  );
}
