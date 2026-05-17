import dns from "node:dns/promises";
import type { DiscoveredMonitor } from "../types.js";

export const discoverMonitors = async (domain: string): Promise<DiscoveredMonitor[]> => {
  const clean = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const suggestions: DiscoveredMonitor[] = [
    { name: `${clean} HTTPS`, host: clean, port: 443, type: "https", tags: ["discovered", clean] },
    { name: `www.${clean} HTTPS`, host: `www.${clean}`, port: 443, type: "https", tags: ["discovered", clean] }
  ];
  try {
    const mx = await dns.resolveMx(clean);
    for (const record of mx.slice(0, 3)) {
      suggestions.push(
        { name: `${record.exchange} SMTP STARTTLS`, host: record.exchange, port: 587, type: "smtp_starttls", tags: ["discovered", "mail", clean] },
        { name: `${record.exchange} IMAPS`, host: record.exchange, port: 993, type: "imaps", tags: ["discovered", "mail", clean] }
      );
    }
  } catch {
    // MX discovery is best effort.
  }
  return suggestions;
};
