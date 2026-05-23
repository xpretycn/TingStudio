import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getNextCode,
  getMaterialStats,
  getMaterialVersions,
  getMaterialVersion,
  getMaterialReferences,
  compareMaterialVersions,
  submitMaterialReview,
  approveMaterial,
  rejectMaterial,
  publishMaterial,
  getMaterialPendingReviews,
  getMaterialReviewLogs,
} from "../controllers/materialController.js";
import { validateBody } from "../middleware/validate.js";

export const materialRoutes = Router();

materialRoutes.use(authMiddleware);

materialRoutes.get("/", getMaterials);
materialRoutes.get("/stats", getMaterialStats);
materialRoutes.get("/next-code", getNextCode);
materialRoutes.get("/pending-review", getMaterialPendingReviews);
materialRoutes.get("/:id", getMaterial);
materialRoutes.get("/:id/versions", getMaterialVersions);
materialRoutes.get("/:id/versions/compare", compareMaterialVersions);
materialRoutes.get("/:id/versions/:versionId", getMaterialVersion);
materialRoutes.get("/:id/references", getMaterialReferences);
materialRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入原料名称" },
    code: { type: "string", required: true, minLength: 1, message: "请输入原料编码" },
  }),
  createMaterial,
);
materialRoutes.put("/:id", updateMaterial);
materialRoutes.delete("/:id", deleteMaterial);
materialRoutes.post("/:id/submit-review", submitMaterialReview);
materialRoutes.put("/:id/approve", approveMaterial);
materialRoutes.put("/:id/reject", rejectMaterial);
materialRoutes.put("/:id/publish", publishMaterial);
materialRoutes.get("/:id/review-logs", getMaterialReviewLogs);