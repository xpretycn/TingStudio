import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getRatioThresholds, updateRatioThresholds } from "../controllers/ratioThresholdController.js";

export const ratioThresholdRoutes = Router();

ratioThresholdRoutes.use(authMiddleware);

ratioThresholdRoutes.get("/", getRatioThresholds);
ratioThresholdRoutes.put("/", updateRatioThresholds);
