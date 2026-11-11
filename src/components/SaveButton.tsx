"use client";

import { useEffect, useState } from "react";

type Photo = { state: "loading" } | { state: "ready"; file: File } | { state: "gone" };

/**
 * Saves the photo: the share sheet ("Save Image") where the phone supports it, a download everywhere else. The photo
 * is fetched when the page opens, so the share sheet opens straight from the tap (phones refuse it after a slow wait).
 */
export function SaveButton({ token }: { token: string }) {
  const [photo, setPhoto] = useState<Photo>({ state: "loading" });
  const [showGone, setShowGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/p/${token}/image`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!cancelled) setPhoto({ state: "ready", file: new File([blob], "studio-portrait.jpg", { type: "image/jpeg" }) });
      })
      .catch(() => !cancelled && setPhoto({ state: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  function save() {
    if (photo.state === "gone") return setShowGone(true);
    if (photo.state === "ready" && navigator.canShare?.({ files: [photo.file] })) {
      navigator.share({ files: [photo.file], title: "My studio portrait" }).catch(() => undefined);
      return;
    }
    const link = document.createElement("a");
    link.href = `/api/p/${token}/image?download=1`;
    link.download = "studio-portrait.jpg";
    link.click();
  }

  return (
    <>
      <button type="button" onClick={save} className="w-full rounded-[3px] bg-gold py-4 text-lg font-semibold tracking-[0.1em] text-noir">
        Save photo
      </button>
      {(showGone || photo.state === "gone") && (
        <p role="alert" className="text-center text-ivory">
          This photo has been deleted
        </p>
      )}
    </>
  );
}
