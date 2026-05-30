import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import type { BackupSettings } from "../types.js";

const backupDir = path.join(path.dirname(env.databasePath), "backups");

export const listBackups = () => {
  fs.mkdirSync(backupDir, { recursive: true });
  return fs.readdirSync(backupDir)
    .filter((name) => /^crtwatch-\d{8}-\d{6}\.sqlite$/.test(name))
    .map((name) => {
      const fullPath = path.join(backupDir, name);
      const stat = fs.statSync(fullPath);
      return { name, size: stat.size, createdAt: stat.birthtime.toISOString() };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
};

export const createBackup = (settings: BackupSettings) => {
  fs.mkdirSync(backupDir, { recursive: true });
  const name = `crtwatch-${stamp(new Date())}.sqlite`;
  const target = path.join(backupDir, name);
  fs.copyFileSync(env.databasePath, target);
  pruneBackups(settings.keep);
  return listBackups().find((backup) => backup.name === name)!;
};

export const backupPath = (name: string) => {
  if (!/^crtwatch-\d{8}-\d{6}\.sqlite$/.test(name)) throw new Error("Invalid backup name.");
  return path.join(backupDir, name);
};

export const deleteBackup = (name: string) => {
  const target = backupPath(name);
  if (fs.existsSync(target)) fs.unlinkSync(target);
};

const pruneBackups = (keep: number) => {
  const stale = listBackups().slice(Math.max(1, keep));
  for (const backup of stale) deleteBackup(backup.name);
};

const stamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const pad = (value: number) => String(value).padStart(2, "0");
