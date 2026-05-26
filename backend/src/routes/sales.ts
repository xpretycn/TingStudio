import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getSalesList, getSalesByFormula, getSalesStats,
  createSale, updateSale, deleteSale
} from "../controllers/salesController.js";

export const salesRoutes = Router();

salesRoutes.get("/", authMiddleware, getSalesList);
salesRoutes.get("/stats", authMiddleware, getSalesStats);
salesRoutes.get("/formula/:formulaId", authMiddleware, getSalesByFormula);
salesRoutes.post("/", authMiddleware, createSale);
salesRoutes.put("/:id", authMiddleware, updateSale);
salesRoutes.delete("/:id", authMiddleware, deleteSale);
