"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  readStoredTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";

function readDomTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function MoonIcon() {
  return (
    <svg
      className="theme-toggle__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="theme-toggle__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readDomTheme);

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initial = getInitialTheme(readStoredTheme(), prefersDark);
    applyTheme(initial);
    setTheme(initial);
  }, []);

  function handleToggle() {
    const next = toggleTheme(theme);
    applyTheme(next);
    setTheme(next);
  }

  const label =
    theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      className="theme-toggle text-link"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
