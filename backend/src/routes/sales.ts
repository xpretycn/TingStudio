import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getSalesList,
  getSalesByFormula,
  getSalesStats,
  createSale,
  updateSale,
  deleteSale,
} from "../controllers/salesController.js";
import { validateBody } from "../middleware/validate.js";

export const salesRoutes = Router();

salesRoutes.use(authMiddleware);

salesRoutes.get("/stats", getSalesStats);
salesRoutes.get("/", getSalesList);
salesRoutes.get("/formula/:formulaId", getSalesByFormula);
salesRoutes.post(
  "/",
  validateBody({
    formulaId: { type: "string", required: true, message: "请选择配方" },
    periodStart: { type: "string", required: true, message: "请选择周期" },
  }),
  createSale
);
salesRoutes.put("/:id", updateSale);
salesRoutes.delete("/:id", deleteSale);
