import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "de_theme";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

let _theme: Theme = getInitialTheme();
let _listeners: Array<() => void> = [];

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

applyTheme(_theme);

function setGlobalTheme(t: Theme) {
  _theme = t;
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  applyTheme(t);
  _listeners.forEach((fn) => fn());
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<Theme>(_theme);

  useEffect(() => {
    const fn = () => setLocalTheme(_theme);
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter((l) => l !== fn); };
  }, []);

  const toggle = useCallback(() => {
    setGlobalTheme(_theme === "dark" ? "light" : "dark");
  }, []);

  const set = useCallback((t: Theme) => {
    setGlobalTheme(t);
  }, []);

  return { theme, toggle, set };
}
