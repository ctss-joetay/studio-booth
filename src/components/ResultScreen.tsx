"use client";

import { useEffect, useRef } from "react";
import { AI_NOTICE } from "@/lib/copy";

export interface Shot {
  token: string;
  imageUrl: string;
  downloadUrl: string;
  qrSvg: string;
}

const IDLE_MS = 2 * 60 * 1000;

/** The finished portrait and the QR code guests scan. Goes back to the start after two idle minutes. */
export function ResultScreen({ shot, onRetake, onDone }: { shot: Shot; onRetake: () => void; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let timer = setTimeout(() => done.current(), IDLE_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => done.current(), IDLE_MS);
    };
    window.addEventListener("pointerdown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, []);

  return (
    <div
      data-testid="result"
      data-download-url={shot.downloadUrl}
      className="fade-in absolute inset-0 z-30 grid grid-cols-[1.2fr_1fr] bg-noir portrait:grid-cols-1 portrait:grid-rows-[1.3fr_1fr]"
    >
      <div className="flex min-h-0 items-center justify-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.imageUrl} alt="Your portrait" className="max-h-full max-w-full object-contain shadow-[0_10px_40px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="flex min-h-0 flex-col gap-5 px-8 py-8">
        <p className="kicker">THE STUDIO</p>
        <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.05]">
          Your portrait
          <br />
          is ready
        </h2>
        <div className="w-[min(220px,24vw)] rounded-[4px] bg-white p-3 portrait:w-44" aria-label="QR code to download your photo" role="img">
          <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: shot.qrSvg }} />
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          <span className="text-ivory">Scan with your phone camera</span> to download. Your photo is deleted soon after you download it, and
          always within 1 hour.
        </p>
        <p className="sr-only">{AI_NOTICE}</p>
        <div className="mt-auto flex gap-3">
          <button type="button" onClick={onRetake} className="flex-1 rounded-[3px] border border-line py-3 tracking-[0.08em]">
            Retake
          </button>
          <button type="button" onClick={onDone} className="flex-1 rounded-[3px] bg-gold py-3 font-semibold tracking-[0.08em] text-noir">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
