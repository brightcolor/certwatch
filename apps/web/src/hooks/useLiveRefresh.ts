import { useEffect, useRef } from "react";

type LiveRefreshOptions = {
  active: boolean;
  paused: boolean;
  page: string;
  selected: string | null;
  refresh: () => Promise<void>;
  refreshOverview: () => Promise<void>;
  loadMonitorData: (id: string) => Promise<void>;
  onTick: () => void;
  intervalMs?: number;
};

export function useLiveRefresh(options: LiveRefreshOptions) {
  const current = useRef(options);
  current.current = options;

  useEffect(() => {
    if (!options.active) return;
    let running = false;
    const run = async () => {
      const next = current.current;
      if (running || document.hidden || next.paused || isFormFieldFocused()) return;
      running = true;
      try {
        if (["settings", "users", "tenants"].includes(next.page)) await next.refresh();
        else await next.refreshOverview();
        if (next.selected) await next.loadMonitorData(next.selected);
        next.onTick();
      } catch {
        // Live refresh should never interrupt the operator workflow.
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(() => void run(), options.intervalMs ?? 10_000);
    const resume = () => { if (!document.hidden) void run(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [options.active, options.intervalMs]);
}

const isFormFieldFocused = () => {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
};
