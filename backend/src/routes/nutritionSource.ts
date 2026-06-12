import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getSources,
  addSource,
  getSourcesCompare,
  updateSource,
  deleteSource,
  setAuthoritative,
  enrichNutrition,
  bulkEnrichNutritionHandler,
  checkSeedAvailability,
  searchSeedByName,
} from "../controllers/nutritionSourceController.js";

type H = unknown;
const asHandler = (fn: unknown) => fn as import("express").RequestHandler;

const nutritionSourceRoutes = Router();

nutritionSourceRoutes.use(authMiddleware);

nutritionSourceRoutes.get(
  "/material/:materialId/sources",
  asHandler(getSources),
);

nutritionSourceRoutes.post(
  "/material/:materialId/sources",
  validateBody({
    sourceType: { type: "string", required: true, enum: ["manual", "tianapi", "seed", "ai", "excel_import", "other"] },
    per100g: { type: "object", required: true },
  }),
  asHandler(addSource),
);

nutritionSourceRoutes.get(
  "/material/:materialId/sources/compare",
  asHandler(getSourcesCompare),
);

nutritionSourceRoutes.put(
  "/material/:materialId/sources/:sourceId",
  asHandler(updateSource),
);

nutritionSourceRoutes.delete(
  "/material/:materialId/sources/:sourceId",
  asHandler(deleteSource),
);

nutritionSourceRoutes.put(
  "/material/:materialId/authoritative",
  validateBody({
    fieldSelections: { type: "object", required: true },
  }),
  asHandler(setAuthoritative),
);

nutritionSourceRoutes.post(
  "/material/:materialId/enrich-nutrition",
  asHandler(enrichNutrition),
);

nutritionSourceRoutes.post(
  "/bulk-enrich-nutrition",
  asHandler(bulkEnrichNutritionHandler),
);

nutritionSourceRoutes.get(
  "/check-seed",
  asHandler(checkSeedAvailability),
);

nutritionSourceRoutes.post(
  "/search-seed",
  asHandler(searchSeedByName),
);

export default nutritionSourceRoutes;
