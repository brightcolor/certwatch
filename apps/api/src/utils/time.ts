export const nowIso = () => new Date().toISOString();

export const addSecondsIso = (seconds: number, from = new Date()) =>
  new Date(from.getTime() + seconds * 1000).toISOString();

export const daysBetween = (from: Date, until: Date) =>
  Math.ceil((until.getTime() - from.getTime()) / 86_400_000);
