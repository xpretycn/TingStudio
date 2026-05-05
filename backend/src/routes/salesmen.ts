// 业务员路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getSalesmen,
  getSalesman,
  createSalesman,
  updateSalesman,
  deleteSalesman,
  toggleSalesmanStatus,
} from "../controllers/salesmanController.js";
import { validateBody } from "../middleware/validate.js";

export const salesmanRoutes = Router();

salesmanRoutes.use(authMiddleware);

salesmanRoutes.get("/", getSalesmen);
salesmanRoutes.get("/:id", getSalesman);
salesmanRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入业务员姓名" },
  }),
  createSalesman,
);
salesmanRoutes.put("/:id", updateSalesman);
salesmanRoutes.delete("/:id", deleteSalesman);
salesmanRoutes.patch("/:id/status", toggleSalesmanStatus);
