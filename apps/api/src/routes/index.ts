import { Router } from "express";
import { requireAuth } from "../auth/auth.js";
import { authRoutes } from "./authRoutes.js";
import { monitorRoutes } from "./monitorRoutes.js";
import { systemRoutes } from "./systemRoutes.js";
import { exportRoutes } from "./exportRoutes.js";
import { opsRoutes } from "./opsRoutes.js";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.get("/health", (_req, res) => res.json({ ok: true }));
apiRoutes.use(requireAuth);
apiRoutes.use("/monitors", monitorRoutes);
apiRoutes.use("/", opsRoutes);
apiRoutes.use("/", systemRoutes);
apiRoutes.use("/export", exportRoutes);
