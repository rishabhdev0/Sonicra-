"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return <div className="size-8" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative size-8 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
      aria-label="Toggle theme"
    >
      <Sun className={`size-4 text-slate-600 dark:text-slate-400 transition-all ${isDark ? "opacity-0 scale-50 absolute" : "opacity-100 scale-100"}`} />
      <Moon className={`size-4 text-slate-400 dark:text-slate-300 transition-all ${isDark ? "opacity-100 scale-100" : "opacity-0 scale-50 absolute"}`} />
    </button>
  );
}
