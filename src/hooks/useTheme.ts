import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let _theme: Theme = getInitialTheme();
let _listeners: (() => void)[] = [];

function applyTheme(t: Theme) {
  _theme = t;
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}

export function useTheme() {
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  useEffect(() => {
    const unsub = subscribe(rerender);
    return unsub;
  }, []);

  return {
    theme: _theme,
    setTheme: (t: Theme) => applyTheme(t),
    toggle: () => applyTheme(_theme === "dark" ? "light" : "dark"),
  };
}
