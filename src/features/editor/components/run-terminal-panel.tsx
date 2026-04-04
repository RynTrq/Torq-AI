"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useTheme } from "next-themes";

import "@xterm/xterm/css/xterm.css";

interface RunTerminalPanelProps {
  output: string;
}

export const RunTerminalPanel = ({ output }: RunTerminalPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLengthRef = useRef(0);
  const latestOutputRef = useRef(output);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    latestOutputRef.current = output;
  }, [output]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }

    const terminalTheme =
      resolvedTheme === "light"
        ? {
            background: "#ffffff",
            foreground: "#1f2328",
            cursor: "#007acc",
            selectionBackground: "#cce6ff",
            black: "#24292f",
            red: "#cf222e",
            green: "#2da44e",
            yellow: "#9a6700",
            blue: "#0969da",
            magenta: "#8250df",
            cyan: "#1b7c83",
            white: "#57606a",
            brightBlack: "#6e7781",
            brightRed: "#ff6b6b",
            brightGreen: "#4ac26b",
            brightYellow: "#bf8700",
            brightBlue: "#218bff",
            brightMagenta: "#a371f7",
            brightCyan: "#2db7c4",
            brightWhite: "#24292f",
          }
        : {
            background: "#181a20",
            foreground: "#d4d4d4",
            cursor: "#3794ff",
            selectionBackground: "#264f78",
            black: "#1e1e1e",
            red: "#f14c4c",
            green: "#4ec9b0",
            yellow: "#dcdcaa",
            blue: "#3794ff",
            magenta: "#c586c0",
            cyan: "#4fc1ff",
            white: "#d4d4d4",
            brightBlack: "#666666",
            brightRed: "#ff6b6b",
            brightGreen: "#7ee787",
            brightYellow: "#e3d26f",
            brightBlue: "#58a6ff",
            brightMagenta: "#d2a8ff",
            brightCyan: "#76e3ea",
            brightWhite: "#f0f6fc",
          };

    const terminal = new Terminal({
      convertEol: true,
      disableStdin: true,
      fontSize: 12,
      fontFamily: "var(--font-plex-mono), monospace",
      theme: terminalTheme,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (latestOutputRef.current) {
      terminal.write(latestOutputRef.current);
      lastLengthRef.current = latestOutputRef.current.length;
    }

    requestAnimationFrame(() => fitAddon.fit());

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (!terminalRef.current) return;

    if (output.length < lastLengthRef.current) {
      terminalRef.current.clear();
      lastLengthRef.current = 0;
    }

    const newData = output.slice(lastLengthRef.current);
    if (newData) {
      terminalRef.current.write(newData);
      lastLengthRef.current = output.length;
    }
  }, [output]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 bg-workspace-sidebar p-3 [&_.xterm]:h-full! [&_.xterm-screen]:h-full! [&_.xterm-viewport]:h-full!"
    />
  );
};
