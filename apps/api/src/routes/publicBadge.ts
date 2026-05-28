import { escapeHtml } from "./publicStatusPage.js";

const HEIGHT = 32;
const FONT_SIZE = 12;
const LABEL_MAX_CHARS = 44;
const VALUE_MAX_CHARS = 20;
const LABEL_MIN_WIDTH = 88;
const LABEL_MAX_WIDTH = 330;
const VALUE_MIN_WIDTH = 76;
const VALUE_MAX_WIDTH = 180;

type BadgeOptions = {
  label: string;
  value: string;
  status: string;
};

export function renderStatusBadge(options: BadgeOptions) {
  const labelText = trimMiddle(cleanText(options.label || "monitor"), LABEL_MAX_CHARS);
  const valueText = trimEnd(cleanText(options.value || options.status || "unknown"), VALUE_MAX_CHARS);
  const labelWidth = clamp(textWidth(labelText) + 26, LABEL_MIN_WIDTH, LABEL_MAX_WIDTH);
  const valueWidth = clamp(textWidth(valueText) + 42, VALUE_MIN_WIDTH, VALUE_MAX_WIDTH);
  const width = labelWidth + valueWidth;
  const color = colorFor(options.status);
  const id = `cw-${hashText(`${labelText}:${valueText}:${options.status}`)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="${xml(`${labelText}: ${valueText}`)}">
  <title>${xml(`${labelText}: ${valueText}`)}</title>
  <defs>
    <clipPath id="${id}-label"><rect x="12" y="0" width="${labelWidth - 24}" height="${HEIGHT}"/></clipPath>
    <clipPath id="${id}-value"><rect x="${labelWidth + 26}" y="0" width="${valueWidth - 38}" height="${HEIGHT}"/></clipPath>
  </defs>
  <rect width="${width}" height="${HEIGHT}" rx="8" fill="#0f172a"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="${HEIGHT}" rx="8" fill="${color}"/>
  <rect x="${labelWidth}" width="8" height="${HEIGHT}" fill="${color}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${HEIGHT - 1}" rx="7.5" fill="none" stroke="#243244"/>
  <text x="13" y="16" clip-path="url(#${id}-label)" fill="#f8fafc" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${FONT_SIZE}" font-weight="700" dominant-baseline="middle">${xml(labelText)}</text>
  <circle cx="${labelWidth + 14}" cy="16" r="4" fill="#fff" opacity="0.92"/>
  <text x="${labelWidth + 26}" y="16" clip-path="url(#${id}-value)" fill="#fff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${FONT_SIZE}" font-weight="800" dominant-baseline="middle">${xml(valueText)}</text>
</svg>`;
}

export function badgeLabelFromQuery(query: unknown, fallback: string) {
  const record = query && typeof query === "object" ? query as Record<string, unknown> : {};
  const label = firstString(record.label) || firstString(record.alias);
  return cleanText(label || fallback || "monitor");
}

export const colorFor = (status: string) => {
  if (status === "OK") return "#16a34a";
  if (status === "WARNING") return "#d97706";
  if (status === "CRITICAL" || status === "DOWN") return "#dc2626";
  if (status === "PAUSED") return "#64748b";
  return "#475569";
};

const xml = escapeHtml;
const textWidth = (value: string) => Math.ceil(value.length * FONT_SIZE * 0.62);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const cleanText = (value: string) =>
  value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

const firstString = (value: unknown) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" ? candidate : "";
};

const trimEnd = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 3)}...`;

const trimMiddle = (value: string, max: number) => {
  if (value.length <= max) return value;
  const end = Math.min(18, Math.floor((max - 3) / 2));
  const start = max - 3 - end;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
