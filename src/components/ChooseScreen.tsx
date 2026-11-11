"use client";

import { useRef } from "react";
import { BACKDROPS, type BackdropId, type Framing, type StyleDef, type StyleId } from "@/lib/styles";
import { StyleTile } from "./StyleTile";

export const AI_NOTICE = "Your photo is edited by an AI service and deleted within 1 hour.";

interface Props {
  styles: StyleDef[];
  style: StyleId;
  backdrop: BackdropId;
  framing: Framing;
  countdown: number;
  canTake: boolean;
  onStyle(id: StyleId): void;
  onBackdrop(id: BackdropId): void;
  onFraming(f: Framing): void;
  onTake(): void;
  onOpenSetup(): void;
}

/** The right-hand panel of the home screen: style, backdrop, framing and the big button. */
export function ChooseScreen(p: Props) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = p.styles.find((s) => s.id === p.style);
  const startPress = () => {
    pressTimer.current = setTimeout(p.onOpenSetup, 700);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div className="fade-in flex h-full min-h-0 flex-col gap-4 px-6 pb-5 pt-6">
      <div>
        <p
          className="kicker inline-block cursor-default py-1"
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
        >
          THE STUDIO
        </p>
        <h1 className="font-display text-[clamp(1.6rem,3.2vw,2.4rem)] leading-tight">Choose your look</h1>
      </div>

      <section className="flex min-h-0 flex-1 flex-col">
        <p className="kicker mb-2">Style</p>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto pr-1">
          {p.styles.map((s) => (
            <StyleTile key={s.id} style={s} selected={s.id === p.style} onSelect={() => p.onStyle(s.id)} />
          ))}
        </div>
      </section>

      <section>
        <p className="kicker mb-2">Backdrop</p>
        {current?.usesBackdrop === false ? (
          <p className="flex h-9 items-center text-sm text-ivory">Pastel backdrop</p>
        ) : (
          <div className="flex h-9 items-center gap-3">
            {BACKDROPS.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-label={`${b.name} backdrop`}
                aria-pressed={b.id === p.backdrop}
                onClick={() => p.onBackdrop(b.id)}
                className={`h-8 w-8 rounded-full border border-line ${b.id === p.backdrop ? "outline-2 outline-offset-2 outline-gold" : ""}`}
                style={{ background: b.hex }}
              />
            ))}
            <span className="ml-1 text-sm text-muted">{BACKDROPS.find((b) => b.id === p.backdrop)?.name}</span>
          </div>
        )}
      </section>

      <section>
        <p className="kicker mb-2">Framing</p>
        <div className="flex overflow-hidden rounded-[3px] border border-line">
          {(["half", "full"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={p.framing === f}
              onClick={() => p.onFraming(f)}
              className={`flex-1 py-2.5 text-sm ${p.framing === f ? "bg-gold font-semibold text-noir" : "text-ivory"}`}
            >
              {f === "half" ? "Half body" : "Full body"}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={!p.canTake}
        onClick={p.onTake}
        className="rounded-[3px] bg-gold py-4 text-center text-noir transition active:scale-[0.99] disabled:opacity-40"
      >
        <span className="block text-lg font-semibold tracking-[0.12em]">TAKE MY PHOTO</span>
        <span className="block text-xs tracking-[0.04em] opacity-75">{p.countdown}-second timer</span>
      </button>
      <p className="text-center text-[11px] text-muted">{AI_NOTICE}</p>
    </div>
  );
}
