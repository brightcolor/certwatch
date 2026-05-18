export type StatusStats = Partial<Record<"warning" | "critical" | "down" | "unknown", number>>;

export const needsFaviconAttention = (stats?: StatusStats | null) =>
  Boolean((stats?.warning ?? 0) + (stats?.critical ?? 0) + (stats?.down ?? 0) + (stats?.unknown ?? 0));

export const applyStatusFavicon = (stats?: StatusStats | null) => {
  if (typeof document === "undefined") return () => undefined;
  const attention = needsFaviconAttention(stats);
  let lit = true;
  const render = () => {
    setFavicon(drawIcon(attention, lit));
    lit = !lit;
  };

  render();
  if (!attention || typeof window === "undefined") return () => undefined;
  const timer = window.setInterval(render, 850);
  return () => window.clearInterval(timer);
};

const setFavicon = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;
};

const drawIcon = (attention: boolean, lit: boolean) => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return "";

  context.clearRect(0, 0, 64, 64);
  context.fillStyle = "#0f172a";
  roundRect(context, 6, 6, 52, 52, 14);
  context.fill();

  const color = attention ? (lit ? "#ef4444" : "#7f1d1d") : "#22c55e";
  context.shadowColor = color;
  context.shadowBlur = attention && !lit ? 3 : 18;
  context.fillStyle = color;
  context.beginPath();
  context.arc(32, 32, 17, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
  context.strokeStyle = attention ? "#fecaca" : "#bbf7d0";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(32, 32, 23, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.75)";
  context.beginPath();
  context.arc(26, 25, 5, 0, Math.PI * 2);
  context.fill();

  return canvas.toDataURL("image/png");
};

const roundRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
};
