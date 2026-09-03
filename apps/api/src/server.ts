import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { attachSession } from "./auth/auth.js";
import { configurePassport } from "./auth/passport.js";
import { db, migrate } from "./storage/db.js";
import { apiRoutes } from "./routes/index.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { metricsHandler } from "./routes/metrics.js";
import { startScheduler } from "./scheduler/scheduler.js";
import { loadFrontPageRenderer, renderFrontPageDocument } from "./render/frontPage.js";

migrate();

const app = express();
if (env.trustProxy) app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use(cookieParser(env.sessionSecret));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(configurePassport());
app.use(attachSession);
app.get("/metrics", metricsHandler);
app.use("/api", apiRoutes);
app.use("/public", publicRoutes);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(currentDir, "../../web/dist");
app.use(express.static(webDist, { index: false }));

/* Visitors without a session get the front page rendered into the document, so
   crawlers and first-time readers see the content instead of an empty div.
   Signed-in visitors get the plain shell as before. */
app.get("*", (req, res) => {
  // Only the root is rendered: it is the address that gets shared and indexed.
  // Every other path is the same single-page app and would otherwise offer
  // search engines the same content under any URL.
  const document = req.path === "/" ? renderFrontPageDocument(Boolean(req.user)) : null;
  if (document) return res.type("html").send(document);
  res.sendFile(path.join(webDist, "index.html"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

await loadFrontPageRenderer(webDist);

app.listen(env.port, () => {
  console.log(`crt.watch listening on ${env.port}`);
  startScheduler();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    db.flush();
    process.exit(0);
  });
}
