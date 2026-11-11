"use client";

import { useEffect, useRef } from "react";

/** Calls onIdle after `ms` without a touch anywhere on the screen, so the booth is ready for the next guests. */
export function useIdle(ms: number, onIdle: () => void): void {
  const callback = useRef(onIdle);
  callback.current = onIdle;
  useEffect(() => {
    let timer = setTimeout(() => callback.current(), ms);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), ms);
    };
    window.addEventListener("pointerdown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [ms]);
}
