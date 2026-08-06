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
      <span aria-hidden="true">{theme === "dark" ? "Claro" : "Escuro"}</span>
    </button>
  );
}
