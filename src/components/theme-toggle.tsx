"use client";

import { useSyncExternalStore } from "react";
import { MoonStarIcon, SunMediumIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDark = isMounted ? resolvedTheme !== "light" : true;

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative inline-flex h-10 w-[84px] items-center rounded-full border border-panel-border bg-panel-elevated p-1 shadow-[0_10px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform hover:-translate-y-0.5",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      <span
        className={cn(
          "absolute inset-y-1 left-1 w-9 rounded-full bg-gradient-to-br from-vscode-blue via-cyan-400 to-vscode-purple shadow-[0_10px_20px_rgba(0,122,204,0.35)] transition-transform duration-300",
          isDark && "translate-x-[40px]"
        )}
      />
      <span
        className={cn(
          "relative z-10 flex w-1/2 items-center justify-center transition-colors",
          !isDark ? "text-slate-950" : "text-muted-foreground"
        )}
      >
        <SunMediumIcon className="size-4" />
      </span>
      <span
        className={cn(
          "relative z-10 flex w-1/2 items-center justify-center transition-colors",
          isDark ? "text-white" : "text-muted-foreground"
        )}
      >
        <MoonStarIcon className="size-4" />
      </span>
    </button>
  );
};
