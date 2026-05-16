import { Router } from "express";
import { monitors, results } from "../storage/repositories.js";

export const publicRoutes = Router();

publicRoutes.get("/status/:tags.html", (req, res) => {
  const status = publicStatus(req.params.tags);
  res.type("html").send(`<!doctype html><html><head><title>CertWatch ${escapeHtml(status.label)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:32px;background:#0d1117;color:#e6edf3}.item{border:1px solid #30363d;border-radius:8px;padding:14px;margin:10px 0}.OK{color:#3fb950}.WARNING{color:#d29922}.CRITICAL,.DOWN{color:#f85149}.PAUSED,.UNKNOWN{color:#8b949e}</style></head><body><h1>CertWatch status: ${escapeHtml(status.label)}</h1><p>${status.summary}</p>${status.monitors.map((monitor) => `<div class="item"><strong>${escapeHtml(monitor.name)}</strong> <span class="${monitor.status}">${monitor.status}</span><br><small>${escapeHtml(monitor.host)}:${monitor.port} - ${escapeHtml(monitor.message)}</small></div>`).join("")}</body></html>`);
});

publicRoutes.get("/badge/:id.svg", (req, res) => {
  const monitor = monitors.get(req.params.id);
  const result = monitor ? results.list(monitor.id, 1)[0] : null;
  const status = monitor?.lastStatus ?? "UNKNOWN";
  const label = encodeXml(monitor?.name ?? "monitor");
  const value = encodeXml(result?.daysRemaining !== null && result?.daysRemaining !== undefined ? `${status} ${result.daysRemaining}d` : status);
  const color = colorFor(status);
  res.type("image/svg+xml").send(`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="28" role="img"><rect width="190" height="28" rx="4" fill="#151b23"/><rect x="95" width="95" height="28" rx="4" fill="${color}"/><text x="10" y="18" fill="#e6edf3" font-family="Verdana" font-size="11">${label}</text><text x="105" y="18" fill="#fff" font-family="Verdana" font-size="11">${value}</text></svg>`);
});

publicRoutes.get("/badge/tags/:tags.svg", (req, res) => {
  const status = publicStatus(req.params.tags);
  const label = encodeXml(status.label);
  const value = encodeXml(status.rollupStatus.toLowerCase());
  const color = colorFor(status.rollupStatus);
  res.type("image/svg+xml").send(`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="28" role="img"><rect width="190" height="28" rx="4" fill="#151b23"/><rect x="95" width="95" height="28" rx="4" fill="${color}"/><text x="10" y="18" fill="#e6edf3" font-family="Verdana" font-size="11">${label}</text><text x="105" y="18" fill="#fff" font-family="Verdana" font-size="11">${value}</text></svg>`);
});

publicRoutes.get("/status/:tags", (req, res) => res.json(publicStatus(req.params.tags)));

const publicStatus = (rawTags: string) => {
  const tags = parseTags(rawTags);
  const latest = results.latestByMonitor();
  const selected = monitors.list().filter((monitor) => tags.length ? tags.every((tag) => monitor.tags.includes(tag)) : true);
  const counts = selected.reduce<Record<string, number>>((acc, monitor) => {
    acc[monitor.lastStatus] = (acc[monitor.lastStatus] ?? 0) + 1;
    return acc;
  }, {});
  const rollupStatus = rollup(counts);
  return {
    tag: tags[0] ?? "all",
    tags,
    label: tags.length ? tags.join(" + ") : "all",
    rollupStatus,
    summary: `${counts.OK ?? 0} OK, ${counts.WARNING ?? 0} warning, ${(counts.CRITICAL ?? 0) + (counts.DOWN ?? 0)} critical/down`,
    monitors: selected.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      host: monitor.host,
      port: monitor.port,
      status: monitor.lastStatus,
      checkedAt: latest[monitor.id]?.checkedAt ?? null,
      daysRemaining: latest[monitor.id]?.daysRemaining ?? null,
      message: latest[monitor.id]?.message ?? "No check result yet."
    }))
  };
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
const encodeXml = escapeHtml;
const parseTags = (value: string) => value.split(/[,+]/).map((tag) => decodeURIComponent(tag).trim()).filter(Boolean);
const rollup = (counts: Record<string, number>) => (counts.DOWN || counts.CRITICAL ? "CRITICAL" : counts.WARNING ? "WARNING" : counts.PAUSED ? "PAUSED" : counts.UNKNOWN ? "UNKNOWN" : "OK");
const colorFor = (status: string) => status === "OK" ? "#3fb950" : status === "WARNING" ? "#d29922" : status === "CRITICAL" || status === "DOWN" ? "#f85149" : "#8b949e";
