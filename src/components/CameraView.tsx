"use client";

import { useEffect, useRef, useState } from "react";
import { cropRect, rotatedSize } from "@/lib/client/capture";
import type { Rotation } from "@/lib/client/settings";
import type { Framing } from "@/lib/styles";

export interface CameraInfo {
  label: string;
  width: number;
  height: number;
}

interface Props {
  deviceId: string | null;
  rotation: Rotation;
  mirror: boolean;
  /** Shows head/feet or head/waist guide lines; null hides them. */
  framing: Framing | null;
  /** The "Step back" / "Step closer" label under the guides; hidden during the countdown. */
  hint?: boolean;
  onReady(video: HTMLVideoElement | null): void;
  onInfo?(info: CameraInfo): void;
  className?: string;
}

const GUIDES: Record<Framing, { bottom: string; hint: string }> = {
  full: { bottom: "FEET", hint: "Step back: head to toe" },
  half: { bottom: "WAIST", hint: "Step closer: waist up" },
};

/**
 * The live camera, framed exactly like the photo it will take (2:3 upright, 3:2 sideways), rotated for how the
 * camera is mounted and mirrored like a mirror. The captured photo is never mirrored.
 */
export function CameraView({ deviceId, rotation, mirror, framing, hint = true, onReady, onInfo, className = "" }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onReady, onInfo });
  callbacks.current = { onReady, onInfo };
  const [status, setStatus] = useState<"starting" | "live" | "failed">("starting");
  const [frame, setFrame] = useState<{ vw: number; vh: number } | null>(null);
  const [outer, setOuter] = useState({ w: 0, h: 0 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setOuter({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // When a camera is plugged in again after failing, try again on its own.
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!media?.addEventListener) return;
    const onChange = () => {
      if (statusRef.current === "failed") setAttempt((n) => n + 1);
    };
    media.addEventListener("devicechange", onChange);
    return () => media.removeEventListener("devicechange", onChange);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setStatus("starting");
    callbacks.current.onReady(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera API");
        const video: MediaTrackConstraints = { width: { ideal: 3840 }, height: { ideal: 2160 } };
        if (deviceId) video.deviceId = { exact: deviceId };
        else video.facingMode = "user";
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (cancelled) return;
        const el = videoRef.current!;
        el.muted = true;
        el.srcObject = stream;
        if (!el.videoWidth) await new Promise((resolve) => el.addEventListener("loadedmetadata", resolve, { once: true }));
        await el.play().catch(() => undefined);
        if (cancelled) return;
        setFrame({ vw: el.videoWidth, vh: el.videoHeight });
        setStatus("live");
        callbacks.current.onReady(el);
        const track = stream.getVideoTracks()[0];
        // A camera unplugged mid-session ends its track: stop offering the button until it is back.
        track?.addEventListener("ended", () => {
          if (cancelled) return;
          setStatus("failed");
          callbacks.current.onReady(null);
        });
        callbacks.current.onInfo?.({ label: track?.label ?? "Camera", width: el.videoWidth, height: el.videoHeight });
      } catch {
        if (cancelled) return;
        setStatus("failed");
        callbacks.current.onReady(null);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [deviceId, attempt]);

  // The visible box has the photo's shape and fits inside the space this view is given.
  const sideways = rotation === 90 || rotation === 270;
  const rotated = frame ? rotatedSize(frame.vw, frame.vh, rotation) : sideways ? { w: 2, h: 3 } : { w: 3, h: 2 };
  const crop = cropRect(rotated.w, rotated.h);
  const aspect = crop.sw / crop.sh;
  const inner = outer.w / outer.h > aspect ? { w: outer.h * aspect, h: outer.h } : { w: outer.w, h: outer.w / aspect };
  const guide = framing ? GUIDES[framing] : null;

  return (
    <div ref={outerRef} data-testid="camera" className={`relative flex items-center justify-center overflow-hidden bg-black ${className}`}>
      <div className="relative overflow-hidden bg-[#111]" style={{ width: inner.w, height: inner.h }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute left-1/2 top-1/2 max-w-none object-cover"
          style={{
            width: sideways ? inner.h : inner.w,
            height: sideways ? inner.w : inner.h,
            transform: `translate(-50%, -50%) ${mirror ? "scaleX(-1) " : ""}rotate(${rotation}deg)`,
          }}
        />
        {guide && status === "live" && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-[10%] top-[6%] border-t border-dashed border-white/70 pt-1 text-[11px] tracking-[0.12em] text-white/90">
              HEAD
            </div>
            <div className="absolute inset-x-[10%] top-[94%] border-t border-dashed border-white/70 pt-1 text-[11px] tracking-[0.12em] text-white/90">
              {guide.bottom}
            </div>
            {hint && (
              <div className="absolute inset-x-0 bottom-[10%] flex justify-center">
                <span className="rounded-full bg-black/55 px-3 py-1 text-xs tracking-[0.08em] text-white">{guide.hint}</span>
              </div>
            )}
          </div>
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm tracking-[0.14em] text-muted">STARTING CAMERA…</div>
        )}
        {status === "failed" && (
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-noir text-ivory"
          >
            <span className="font-display text-2xl">Camera unavailable — tap to retry</span>
            <span className="max-w-sm text-center text-sm text-muted">
              Check the camera is plugged in and allowed in Safari, or choose another camera in Setup.
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
