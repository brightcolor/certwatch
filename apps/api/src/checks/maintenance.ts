import type { MaintenanceSettings, Monitor } from "../types.js";

export const isInMaintenance = (monitor: Monitor, settings: MaintenanceSettings, date = new Date()) =>
  Boolean(monitorWindowActive(monitor.maintenanceWindows, date) || settings.windows.some((window) =>
    window.enabled && window.tags.some((tag) => monitor.tags.includes(tag)) && windowActive(window.window, date)
  ));

export const monitorWindowActive = (value: string | null | undefined, date = new Date()) => {
  if (!value) return false;
  return value.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).some((line) => windowActive(line, date));
};

export const windowActive = (value: string, date = new Date()) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.includes("/")) return isoIntervalActive(trimmed, date);
  const daily = trimmed.match(/^(daily\s+)?(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (daily) return clockRangeActive(daily[2], daily[3], date);
  const weekly = trimmed.match(/^(mon|tue|wed|thu|fri|sat|sun)(-(mon|tue|wed|thu|fri|sat|sun))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (weekly && dayMatches(weekly[1], weekly[3], date)) return clockRangeActive(weekly[4], weekly[5], date);
  return false;
};

const isoIntervalActive = (value: string, date: Date) => {
  const [start, end] = value.split("/");
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  return Number.isFinite(startTime) && Number.isFinite(endTime) && date.getTime() >= startTime && date.getTime() <= endTime;
};

const clockRangeActive = (start: string, end: string, date: Date) => {
  const now = date.getHours() * 60 + date.getMinutes();
  const startMinutes = clock(start);
  const endMinutes = clock(end);
  if (startMinutes === endMinutes) return false;
  return startMinutes < endMinutes ? now >= startMinutes && now < endMinutes : now >= startMinutes || now < endMinutes;
};

const dayMatches = (start: string, end: string | undefined, date: Date) => {
  const current = (date.getDay() + 6) % 7;
  const startIndex = days.indexOf(start);
  const endIndex = end ? days.indexOf(end) : startIndex;
  return startIndex <= endIndex ? current >= startIndex && current <= endIndex : current >= startIndex || current <= endIndex;
};

const clock = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
