import { useEffect } from "react";

export interface FrameBudgetEntry {
  label: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  frames: number;
  longFrames: number;
  maxFrameMs: number;
  avgFrameMs: number;
  avgFps: number;
}

declare global {
  interface Window {
    __PHOTOMAP_FRAME_BUDGET__?: FrameBudgetEntry[];
    __PHOTOMAP_FRAME_BUDGET_ACTIVE__?: Record<string, FrameBudgetEntry>;
    __PHOTOMAP_EXPORT_FRAME_BUDGET__?: () => FrameBudgetEntry[];
    __PHOTOMAP_RESET_FRAME_BUDGET__?: () => void;
  }
}

const isFrameProbeEnabled = import.meta.env.VITE_ENABLE_FRAME_PROBE === "true";

const round = (value: number) => Math.round(value * 100) / 100;

const getEntries = () => {
  window.__PHOTOMAP_FRAME_BUDGET__ ??= [];
  return window.__PHOTOMAP_FRAME_BUDGET__;
};

const getActiveEntries = () => {
  window.__PHOTOMAP_FRAME_BUDGET_ACTIVE__ ??= {};
  return window.__PHOTOMAP_FRAME_BUDGET_ACTIVE__;
};

export const installFrameBudgetHelpers = () => {
  if (!isFrameProbeEnabled || typeof window === "undefined") return;

  getEntries();
  getActiveEntries();
  window.__PHOTOMAP_EXPORT_FRAME_BUDGET__ = () => [
    ...getEntries(),
    ...Object.values(getActiveEntries()),
  ];
  window.__PHOTOMAP_RESET_FRAME_BUDGET__ = () => {
    window.__PHOTOMAP_FRAME_BUDGET__ = [];
    window.__PHOTOMAP_FRAME_BUDGET_ACTIVE__ = {};
  };
};

export const useFrameBudgetProbe = (label: string) => {
  useEffect(() => {
    if (!isFrameProbeEnabled || typeof window === "undefined") return;

    installFrameBudgetHelpers();

    let frameCount = 0;
    let longFrames = 0;
    let frameTotal = 0;
    let maxFrameMs = 0;
    let rafId = 0;
    const startedAt = performance.now();
    const startedAtIso = new Date().toISOString();
    let lastFrameAt = startedAt;

    const writeSnapshot = () => {
      const now = performance.now();
      const durationMs = Math.max(now - startedAt, 1);
      getActiveEntries()[label] = {
        label,
        startedAt: startedAtIso,
        endedAt: new Date().toISOString(),
        durationMs: round(durationMs),
        frames: frameCount,
        longFrames,
        maxFrameMs: round(maxFrameMs),
        avgFrameMs: round(frameCount > 0 ? frameTotal / frameCount : 0),
        avgFps: round((frameCount / durationMs) * 1000),
      };
    };

    const tick = (now: number) => {
      const frameMs = now - lastFrameAt;
      frameCount += 1;
      frameTotal += frameMs;
      maxFrameMs = Math.max(maxFrameMs, frameMs);
      if (frameMs > 50) longFrames += 1;
      lastFrameAt = now;
      writeSnapshot();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      writeSnapshot();
      const snapshot = getActiveEntries()[label];
      getEntries().push(snapshot);
      delete getActiveEntries()[label];
    };
  }, [label]);
};