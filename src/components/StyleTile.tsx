import type { StyleDef } from "@/lib/styles";
import { Silhouette } from "./Silhouette";

const FIGURE: Partial<Record<StyleDef["id"], string>> = { bw: "#d8d8d8", hollywood: "#e2e2e2", kawaii: "#6b5a7b", warm: "#3b2617" };

export function StyleTile({ style, selected, onSelect }: { style: StyleDef; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group overflow-hidden rounded-[3px] border text-left transition ${
        selected ? "border-gold outline-2 outline-offset-1 outline-gold" : "border-line hover:border-muted"
      }`}
    >
      <span className="relative flex aspect-[5/4] items-end justify-center overflow-hidden" style={{ background: style.swatch }}>
        {style.id === "magazine" && <span className="absolute inset-x-0 top-1 text-center font-display text-lg tracking-[0.08em] text-white">GLAM</span>}
        {style.id === "kawaii" && (
          <>
            <span className="absolute left-2 top-1 text-xs text-white">✦</span>
            <span className="absolute right-2 top-2 text-xs text-pink-500">♡</span>
            <span className="absolute bottom-2 left-3 text-[10px] text-yellow-200">★</span>
          </>
        )}
        {style.id === "polaroid" && <span className="absolute inset-[6px_6px_16px_6px] shadow-[0_0_0_6px_#fbfbf8]" />}
        <Silhouette fill={FIGURE[style.id] ?? "#1f1f21"} className="relative h-[86%] w-auto" />
      </span>
      <span className="block bg-noir-2 px-2 py-1.5">
        <span className="block truncate text-[13px] text-ivory">{style.name}</span>
        <span className="block truncate text-[10.5px] text-muted">{style.tagline}</span>
      </span>
    </button>
  );
}
