"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  /** Seconds to wait before the tween starts (lets the card finish landing first) */
  delay?: number;
  className?: string;
}

/** Tweens an integer from 0 to {value} over {duration}ms using rAF + easeOutCubic.
 *  Optional {delay} (seconds) holds at 0 before the tween starts. */
export function CountUp({ value, duration = 1400, delay = 0, className }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDisplay(0);

    const timeoutId = window.setTimeout(() => {
      const step = (ts: number) => {
        if (startRef.current === null) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const t = Math.min(1, elapsed / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(value * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      window.clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, delay]);

  return <span className={`tabular-nums ${className ?? ""}`}>{display}</span>;
}
