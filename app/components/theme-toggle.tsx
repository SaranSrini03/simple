"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      applyTheme(stored);
      return;
    }

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme: Theme = systemDark ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function handleToggle() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button type="button" className="theme-toggle" onClick={handleToggle}>
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
