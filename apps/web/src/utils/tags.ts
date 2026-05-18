export const parseTags = (input: string) =>
  input.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean);

export const mergeTags = (current: string[], draft: string) =>
  [...new Set([...current, ...parseTags(draft)])];
