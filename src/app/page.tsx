"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "@/components/CameraView";
import { ChooseScreen } from "@/components/ChooseScreen";
import { Countdown, playShutter } from "@/components/Countdown";
import { Developing } from "@/components/Developing";
import { ErrorScreen } from "@/components/ErrorScreen";
import { PinGate } from "@/components/PinGate";
import { ResultScreen, type Shot } from "@/components/ResultScreen";
import { captureFrame } from "@/lib/client/capture";
import { DEFAULT_SETTINGS, loadSettings, type BoothSettings } from "@/lib/client/settings";
import { BACKDROPS, STYLES, getStyle, type BackdropId, type Framing, type StyleId } from "@/lib/styles";

type Phase = "loading" | "locked" | "choose" | "countdown" | "developing" | "result" | "error";

interface Failure {
  message: string;
  detail?: string;
}

export default function BoothPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [settings, setSettings] = useState<BoothSettings>(DEFAULT_SETTINGS);
  const [style, setStyle] = useState<StyleId>("professional");
  const [backdrop, setBackdrop] = useState<BackdropId>("grey");
  const [framing, setFraming] = useState<Framing>("full");
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const lastCapture = useRef<Blob | null>(null);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setStyle(loaded.enabledStyles[0]);
    fetch("/api/session")
      .then((r) => r.json())
      .then((b: { unlocked?: boolean }) => setPhase(b.unlocked ? "choose" : "locked"))
      .catch(() => setPhase("locked"));
  }, []);

  useEffect(() => () => void (captureUrl && URL.revokeObjectURL(captureUrl)), [captureUrl]);

  const styles = STYLES.filter((s) => settings.enabledStyles.includes(s.id));
  const styleDef = getStyle(style);

  const upload = useCallback(
    async (blob: Blob) => {
      setPhase("developing");
      const form = new FormData();
      form.set("photo", blob, "shot.jpg");
      form.set("style", style);
      form.set("backdrop", backdrop);
      form.set("framing", framing);
      form.set("eventName", settings.eventName);
      try {
        const res = await fetch("/api/shots", { method: "POST", body: form });
        const body = (await res.json().catch(() => ({}))) as Partial<Shot> & { error?: string; detail?: string };
        if (res.status === 401) return setPhase("locked");
        if (!res.ok || !body.token) {
          setFailure({ message: body.error ?? "Something went wrong.", detail: body.detail });
          return setPhase("error");
        }
        // Show the result only once the image is ready, so it appears in one piece.
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = body.imageUrl!;
        });
        setShot(body as Shot);
        setPhase("result");
      } catch {
        setFailure({ message: "No connection. Check the iPad's Wi-Fi and try again." });
        setPhase("error");
      }
    },
    [style, backdrop, framing, settings.eventName],
  );

  const capture = useCallback(async () => {
    setFlashKey((k) => k + 1);
    playShutter(audio.current);
    if (!video) {
      setFailure({ message: "The camera stopped. Check it and try again." });
      return setPhase("error");
    }
    try {
      const blob = await captureFrame(video, settings.rotation);
      lastCapture.current = blob;
      setCaptureUrl(URL.createObjectURL(blob));
      await upload(blob);
    } catch {
      setFailure({ message: "The camera couldn't take the photo. Try again." });
      setPhase("error");
    }
  }, [video, settings.rotation, upload]);

  const startCountdown = () => {
    // A tap starts the audio, so the shutter can click when the countdown ends.
    if (!audio.current && typeof AudioContext !== "undefined") audio.current = new AudioContext();
    void audio.current?.resume();
    setFailure(null);
    setPhase("countdown");
  };

  const forgetShot = (deleteIt: boolean) => {
    if (shot && deleteIt) void fetch(`/api/shots/${shot.token}`, { method: "DELETE" }).catch(() => undefined);
    setShot(null);
  };

  const live = phase !== "loading" && phase !== "locked";
  const fullScreenCamera = phase === "countdown";
  const backdropName = styleDef.usesBackdrop ? BACKDROPS.find((b) => b.id === backdrop)!.name : "Pastel";
  const caption = `${styleDef.name} · ${backdropName} backdrop · ${framing === "full" ? "Full body" : "Half body"}`.toUpperCase();

  return (
    <main className="fixed inset-0 overflow-hidden bg-noir">
      {live && (
        <div
          className={`absolute transition-all duration-500 ease-out ${
            fullScreenCamera ? "inset-0" : "inset-y-0 left-0 w-[58%] portrait:inset-x-0 portrait:bottom-auto portrait:h-[52%] portrait:w-full"
          }`}
        >
          <CameraView
            deviceId={settings.cameraId}
            rotation={settings.rotation}
            mirror={settings.mirror}
            framing={phase === "choose" || phase === "countdown" ? framing : null}
            hint={phase === "choose"}
            onReady={setVideo}
            className="h-full w-full"
          />
        </div>
      )}

      {phase === "choose" && (
        <aside className="absolute inset-y-0 right-0 w-[42%] border-l border-line portrait:inset-x-0 portrait:top-auto portrait:h-[48%] portrait:w-full portrait:border-l-0 portrait:border-t">
          <ChooseScreen
            styles={styles}
            style={style}
            backdrop={backdrop}
            framing={framing}
            countdown={settings.countdown}
            canTake={!!video}
            onStyle={setStyle}
            onBackdrop={setBackdrop}
            onFraming={setFraming}
            onTake={startCountdown}
            onOpenSetup={() => router.push("/setup")}
          />
        </aside>
      )}

      {phase === "countdown" && <Countdown seconds={settings.countdown} caption={caption} onDone={capture} />}
      {phase === "developing" && <Developing photoUrl={captureUrl} styleName={styleDef.name} />}
      {phase === "result" && shot && (
        <ResultScreen
          shot={shot}
          onRetake={() => {
            forgetShot(true);
            startCountdown();
          }}
          onDone={() => {
            forgetShot(false);
            setPhase("choose");
          }}
        />
      )}
      {phase === "error" && failure && (
        <ErrorScreen
          message={failure.message}
          detail={failure.detail}
          onRetry={() => (lastCapture.current ? void upload(lastCapture.current) : setPhase("choose"))}
          onStartOver={() => setPhase("choose")}
        />
      )}
      {phase === "locked" && <PinGate onUnlocked={() => setPhase("choose")} />}
      {flashKey > 0 && <div key={flashKey} className="flash pointer-events-none fixed inset-0 z-50 bg-white" />}
    </main>
  );
}
