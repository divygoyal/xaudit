"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "xa-theme";

export function ThemeToggle() {
  // On SSR we default to false; we sync to the actual html class right after mount.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    setIsDark(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // private mode — fine
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      suppressHydrationWarning
      className="group relative inline-flex h-9 w-[68px] cursor-pointer items-center rounded-full border border-ink-700 bg-ink-900 px-1 transition-colors hover:border-vermillion"
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-ink-400">
        <Sun size={13} strokeWidth={1.8} className={isDark ? "opacity-100" : "opacity-25"} />
        <Moon size={12} strokeWidth={1.8} className={isDark ? "opacity-25" : "opacity-100"} />
      </span>
      <span
        className="theme-toggle-thumb relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink-950 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.18)]"
        style={{ transform: isDark ? "translateX(32px)" : "translateX(0)" }}
      >
        {isDark ? <Moon size={13} strokeWidth={2} /> : <Sun size={13} strokeWidth={2} />}
      </span>
    </button>
  );
}
