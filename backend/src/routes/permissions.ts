import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getAllPermissions } from "../controllers/permissionController.js";

export const permissionRoutes = Router();

permissionRoutes.use(authMiddleware);

permissionRoutes.get("/", getAllPermissions);
