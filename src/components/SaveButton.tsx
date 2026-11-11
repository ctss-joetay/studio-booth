"use client";

import { useState } from "react";

/** Saves the photo: the share sheet ("Save Image") where the phone supports it, a download everywhere else. */
export function SaveButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const blob = await (await fetch(`/api/p/${token}/image`)).blob();
      const file = new File([blob], "studio-portrait.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My studio portrait" });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    } finally {
      setBusy(false);
    }
    const link = document.createElement("a");
    link.href = `/api/p/${token}/image?download=1`;
    link.download = "studio-portrait.jpg";
    link.click();
  }

  return (
    <button type="button" onClick={save} disabled={busy} className="w-full rounded-[3px] bg-gold py-4 text-lg font-semibold tracking-[0.1em] text-noir">
      {busy ? "Saving…" : "Save photo"}
    </button>
  );
}
