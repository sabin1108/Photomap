import type { ProfilerOnRenderCallback } from "react";

export interface PhotomapProfilerEntry {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  recordedAt: string;
}

export interface PhotomapProfilerExport {
  createdAt: string;
  entryCount: number;
  entries: PhotomapProfilerEntry[];
  summary: Record<string, {
    commits: number;
    maxActualDuration: number;
    avgActualDuration: number;
    maxBaseDuration: number;
    avgBaseDuration: number;
  }>;
}

declare global {
  interface Window {
    __PHOTOMAP_PROFILER__?: PhotomapProfilerEntry[];
    __PHOTOMAP_EXPORT_PROFILER__?: () => PhotomapProfilerExport;
    __PHOTOMAP_RESET_PROFILER__?: () => void;
  }
}

export const isProfilerEnabled = import.meta.env.VITE_ENABLE_PROFILER === "true";

const maxEntries = Number(import.meta.env.VITE_PROFILER_MAX_ENTRIES ?? 500);

const getEntries = () => {
  window.__PHOTOMAP_PROFILER__ ??= [];
  return window.__PHOTOMAP_PROFILER__;
};

const round = (value: number) => Math.round(value * 100) / 100;

export const exportProfilerData = (): PhotomapProfilerExport => {
  const entries = getEntries();
  const summary: PhotomapProfilerExport["summary"] = {};

  for (const entry of entries) {
    const current = summary[entry.id] ?? {
      commits: 0,
      maxActualDuration: 0,
      avgActualDuration: 0,
      maxBaseDuration: 0,
      avgBaseDuration: 0,
    };

    current.commits += 1;
    current.maxActualDuration = Math.max(current.maxActualDuration, entry.actualDuration);
    current.avgActualDuration += entry.actualDuration;
    current.maxBaseDuration = Math.max(current.maxBaseDuration, entry.baseDuration);
    current.avgBaseDuration += entry.baseDuration;
    summary[entry.id] = current;
  }

  for (const item of Object.values(summary)) {
    item.avgActualDuration = round(item.avgActualDuration / item.commits);
    item.avgBaseDuration = round(item.avgBaseDuration / item.commits);
    item.maxActualDuration = round(item.maxActualDuration);
    item.maxBaseDuration = round(item.maxBaseDuration);
  }

  return {
    createdAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
    summary,
  };
};

export const resetProfilerData = () => {
  window.__PHOTOMAP_PROFILER__ = [];
};

export const installProfilerHelpers = () => {
  if (!isProfilerEnabled || typeof window === "undefined") return;

  getEntries();
  window.__PHOTOMAP_EXPORT_PROFILER__ = exportProfilerData;
  window.__PHOTOMAP_RESET_PROFILER__ = resetProfilerData;
};

export const recordProfilerCommit: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (!isProfilerEnabled || typeof window === "undefined") return;

  const entries = getEntries();
  entries.push({
    id,
    phase,
    actualDuration: round(actualDuration),
    baseDuration: round(baseDuration),
    startTime: round(startTime),
    commitTime: round(commitTime),
    recordedAt: new Date().toISOString(),
  });

  if (entries.length > maxEntries) {
    entries.splice(0, entries.length - maxEntries);
  }
};