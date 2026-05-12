import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { attachSession } from "./auth/auth.js";
import { migrate, seedAdmin } from "./storage/db.js";
import { apiRoutes } from "./routes/index.js";
import { startScheduler } from "./scheduler/scheduler.js";

migrate();
seedAdmin();

const app = express();
if (env.trustProxy) app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(env.sessionSecret));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(attachSession);
app.use("/api", apiRoutes);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(currentDir, "../../web/dist");
app.use(express.static(webDist));
app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(env.port, () => {
  console.log(`CertWatch listening on ${env.port}`);
  startScheduler();
});
