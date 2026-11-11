/** While the AI works: the captured frame, dimmed, with a gold shimmer and a slow progress bar. */
export function Developing({ photoUrl, styleName }: { photoUrl: string | null; styleName: string }) {
  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-noir">
      <div className="relative h-[46vh] overflow-hidden border border-line">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-auto blur-[3px] brightness-[0.6] grayscale" />
        )}
        <div className="shimmer absolute inset-0" />
      </div>
      <h2 className="font-display text-4xl">Developing your portrait</h2>
      <div className="relative h-[2px] w-[34vw] bg-line">
        <div className="develop-bar absolute inset-y-0 left-0 bg-gold" />
      </div>
      <p className="kicker">{styleName} · usually under 40 seconds</p>
    </div>
  );
}
