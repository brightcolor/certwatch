import type { CheckResult } from "../types.js";

export const markFlapping = (result: CheckResult, recent: CheckResult[], threshold = 4) => {
  const statuses = [result.status, ...recent.map((item) => item.status)];
  let changes = 0;
  for (let index = 1; index < statuses.length; index += 1) {
    if (statuses[index] !== statuses[index - 1]) changes += 1;
  }
  if (changes < threshold) return result;
  const problems = [...new Set([...result.problems, "Monitor is flapping between states."])];
  return {
    ...result,
    flapping: true,
    status: result.status === "OK" ? "WARNING" as const : result.status,
    severity: result.severity === "info" ? "warning" as const : result.severity,
    message: result.status === "OK" ? "Monitor is flapping between states." : result.message,
    problems
  };
};
