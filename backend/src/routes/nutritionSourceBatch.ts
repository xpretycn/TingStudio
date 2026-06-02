import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getRecommendation,
  batchSetAuthoritative,
  batchArchive,
  batchRestore,
  exportSources,
  getSourcesWithScores,
} from "../controllers/nutritionSourceBatchController.js";
import {
  listMaterialSnapshots,
  getSnapshotDetail,
} from "../controllers/nutritionSourceSnapshotController.js";

type H = unknown;
const asHandler = (fn: unknown) => fn as import("express").RequestHandler;

const nutritionSourceBatchRoutes = Router();

nutritionSourceBatchRoutes.use(authMiddleware);

nutritionSourceBatchRoutes.get(
  "/material/:materialId/sources/scored",
  asHandler(getSourcesWithScores),
);

nutritionSourceBatchRoutes.get(
  "/material/:materialId/sources/recommendation",
  asHandler(getRecommendation),
);

nutritionSourceBatchRoutes.post(
  "/material/:materialId/sources/batch-set-authoritative",
  validateBody({
    strategy: { type: "string", required: false },
    sourceIds: { type: "array", required: false },
    fieldSelections: { type: "object", required: false },
  }),
  asHandler(batchSetAuthoritative),
);

nutritionSourceBatchRoutes.post(
  "/material/:materialId/sources/batch-archive",
  validateBody({
    sourceIds: { type: "array", required: true },
  }),
  asHandler(batchArchive),
);

nutritionSourceBatchRoutes.post(
  "/material/:materialId/sources/batch-restore",
  validateBody({
    sourceIds: { type: "array", required: true },
  }),
  asHandler(batchRestore),
);

nutritionSourceBatchRoutes.get(
  "/material/:materialId/sources/export",
  asHandler(exportSources),
);

nutritionSourceBatchRoutes.get(
  "/material/:materialId/snapshots",
  asHandler(listMaterialSnapshots),
);

nutritionSourceBatchRoutes.get(
  "/snapshots/:snapshotId",
  asHandler(getSnapshotDetail),
);

export default nutritionSourceBatchRoutes;
