"use client";

import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/** Student helpers unlock the booth (and Setup) on a device with the PIN. */
export function PinGate({ onUnlocked, title = "Unlock the booth" }: { onUnlocked: () => void; title?: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pin || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
      if (res.ok) return onUnlocked();
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Couldn't unlock. Try again.");
      setPin("");
    } catch {
      setError("No connection. Check the iPad's Wi-Fi.");
    } finally {
      setBusy(false);
    }
  }

  function press(key: (typeof KEYS)[number]) {
    setError(null);
    if (key === "clear") setPin("");
    else if (key === "back") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < 12 ? p + key : p));
  }

  return (
    <div className="fade-in fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-noir px-6">
      <p className="kicker">THE STUDIO</p>
      <h1 className="font-display text-4xl">{title}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex w-full max-w-xs flex-col items-center gap-5"
      >
        <input
          aria-label="Booth PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
          className="w-full border-b border-line bg-transparent py-2 text-center text-3xl tracking-[0.5em] text-ivory outline-none focus:border-gold"
        />
        <div className="grid w-full grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="h-14 rounded-[3px] border border-line text-xl text-ivory active:bg-noir-2"
              aria-label={key === "back" ? "Delete" : key === "clear" ? "Clear" : key}
            >
              {key === "back" ? "⌫" : key === "clear" ? "C" : key}
            </button>
          ))}
        </div>
        <button type="submit" disabled={!pin || busy} className="w-full rounded-[3px] bg-gold py-3 font-semibold tracking-[0.08em] text-noir disabled:opacity-40">
          {busy ? "Checking…" : "Unlock"}
        </button>
        <p role="alert" className="min-h-5 text-sm text-red-300">
          {error}
        </p>
      </form>
    </div>
  );
}
