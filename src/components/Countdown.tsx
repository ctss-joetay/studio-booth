"use client";

import { useEffect, useRef, useState } from "react";

/** Counts down over the full-screen camera, then calls onDone once. */
export function Countdown({ seconds, caption, onDone }: { seconds: number; caption: string; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [progress, setProgress] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const started = performance.now();
    let fired = false;
    const timer = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      setProgress(Math.min(1, elapsed / seconds));
      setLeft(Math.max(0, Math.ceil(seconds - elapsed)));
      if (elapsed >= seconds && !fired) {
        fired = true;
        clearInterval(timer);
        done.current();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [seconds]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-x-6 top-5 flex justify-between text-[11px] tracking-[0.16em] text-white/85">
        <span>{caption}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div
          className="absolute h-56 w-56 rounded-full"
          style={{
            background: `conic-gradient(var(--color-gold) ${progress * 360}deg, rgba(255,255,255,0.18) 0)`,
            WebkitMask: "radial-gradient(circle, transparent 104px, #000 105px)",
            mask: "radial-gradient(circle, transparent 104px, #000 105px)",
          }}
        />
        {left > 0 && (
          <span key={left} className="tick font-display text-[150px] leading-none text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            {left}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-8 text-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
        <p className="font-display text-3xl">Hold your pose</p>
        <p className="mt-1 text-xs tracking-[0.16em]">LOOK INTO THE CAMERA</p>
      </div>
    </div>
  );
}

/** A short camera-shutter click. The AudioContext must have been started by a tap. */
export function playShutter(ctx: AudioContext | null): void {
  if (!ctx) return;
  try {
    const length = Math.floor(ctx.sampleRate * 0.09);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    // Sound is a nicety; the photo is what matters.
  }
}
