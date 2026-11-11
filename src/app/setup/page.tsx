"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CameraView, type CameraInfo } from "@/components/CameraView";
import { PinGate } from "@/components/PinGate";
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, type BoothSettings, type Rotation } from "@/lib/client/settings";
import { STYLES, type StyleId } from "@/lib/styles";

const ROTATIONS: { value: Rotation; label: string }[] = [
  { value: 0, label: "Upright (0°)" },
  { value: 90, label: "Sideways, turned right (90°)" },
  { value: 270, label: "Sideways, turned left (270°)" },
  { value: 180, label: "Upside down (180°)" },
];

interface AiTest {
  ok: boolean;
  mode: string;
  seconds: number;
  error?: string;
}

/** Student helpers: camera, mounting, timer, event name, styles and an AI check. Saved on this iPad. */
export default function SetupPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<BoothSettings>(DEFAULT_SETTINGS);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [info, setInfo] = useState<CameraInfo | null>(null);
  const [aiTest, setAiTest] = useState<AiTest | "running" | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    fetch("/api/session")
      .then((r) => r.json())
      .then((b: { unlocked?: boolean }) => setUnlocked(!!b.unlocked))
      .catch(() => setUnlocked(false));
  }, []);

  const update = (change: Partial<BoothSettings>) => {
    const next = parseSettings({ ...settings, ...change });
    setSettings(next);
    saveSettings(next);
  };

  // Camera names only appear once the browser has been allowed to use a camera.
  const listCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      setCameras([]);
    }
  }, []);

  async function testAi() {
    setAiTest("running");
    try {
      const res = await fetch("/api/test-ai", { method: "POST" });
      setAiTest((await res.json()) as AiTest);
    } catch {
      setAiTest({ ok: false, mode: "?", seconds: 0, error: "No connection." });
    }
  }

  const toggleStyle = (id: StyleId, on: boolean) => {
    const enabled = on ? [...settings.enabledStyles, id] : settings.enabledStyles.filter((s) => s !== id);
    if (enabled.length) update({ enabledStyles: enabled });
  };

  if (unlocked === null) return <main className="fixed inset-0 bg-noir" />;
  if (!unlocked) return <PinGate title="Booth setup" onUnlocked={() => setUnlocked(true)} />;

  return (
    <main className="fade-in min-h-full bg-noir px-6 py-6 select-text">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-3">
          <p className="kicker">THE STUDIO</p>
          <h1 className="font-display text-4xl">Booth setup</h1>
          <CameraView
            deviceId={settings.cameraId}
            rotation={settings.rotation}
            mirror={settings.mirror}
            framing="full"
            onReady={(video) => video && void listCameras()}
            onInfo={setInfo}
            className="aspect-[4/3] w-full rounded-[3px] border border-line"
          />
          <p className="text-sm text-muted" data-testid="camera-info">
            {info ? `${info.label} · ${info.width} × ${info.height}` : "No camera running"}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            A Canon on USB-C must act as a USB webcam (iPadOS 17 or later). If it isn&apos;t listed, use an HDMI-to-USB-C capture adapter, or
            pick the iPad&apos;s own camera for now. Upright suits one or two people; sideways suits groups.
          </p>
        </section>

        <section className="space-y-6">
          <label className="block space-y-2">
            <span className="kicker block">Camera</span>
            <select
              aria-label="Camera"
              value={settings.cameraId ?? ""}
              onChange={(e) => update({ cameraId: e.target.value || null })}
              className="w-full rounded-[3px] border border-line bg-noir-2 px-3 py-3 text-ivory"
            >
              <option value="">Default camera (front)</option>
              {cameras.map((c, i) => (
                <option key={c.deviceId || i} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="kicker block">Camera mounting</span>
            <select
              aria-label="Camera mounting"
              value={settings.rotation}
              onChange={(e) => update({ rotation: Number(e.target.value) as Rotation })}
              className="w-full rounded-[3px] border border-line bg-noir-2 px-3 py-3 text-ivory"
            >
              {ROTATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={settings.mirror} onChange={(e) => update({ mirror: e.target.checked })} className="h-5 w-5 accent-[#c8a96a]" />
            <span>Mirror the live view (photos are never mirrored)</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="kicker block">Countdown seconds</span>
              <input
                aria-label="Countdown seconds"
                type="number"
                min={1}
                max={30}
                value={settings.countdown}
                onChange={(e) => update({ countdown: Number(e.target.value) })}
                className="w-full rounded-[3px] border border-line bg-noir-2 px-3 py-3 text-ivory"
              />
            </label>
            <label className="block space-y-2">
              <span className="kicker block">Event name</span>
              <input
                aria-label="Event name"
                maxLength={40}
                placeholder="Open House"
                value={settings.eventName}
                onChange={(e) => update({ eventName: e.target.value })}
                className="w-full rounded-[3px] border border-line bg-noir-2 px-3 py-3 text-ivory"
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="kicker mb-2">Styles shown to guests</legend>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.enabledStyles.includes(s.id)}
                    onChange={(e) => toggleStyle(s.id, e.target.checked)}
                    className="h-4 w-4 accent-[#c8a96a]"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <button type="button" onClick={testAi} disabled={aiTest === "running"} className="rounded-[3px] border border-gold px-5 py-3 text-gold disabled:opacity-50">
              {aiTest === "running" ? "Testing…" : "Test the AI"}
            </button>
            {aiTest && aiTest !== "running" && (
              <p role="status" className={`text-sm ${aiTest.ok ? "text-ivory" : "text-red-300"}`}>
                {aiTest.ok ? `Working (${aiTest.mode} mode, ${aiTest.seconds.toFixed(1)} s).` : `Failed: ${aiTest.error}`}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/" className="rounded-[3px] bg-gold px-6 py-3 font-semibold tracking-[0.08em] text-noir">
              Back to booth
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
