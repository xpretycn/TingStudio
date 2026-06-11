import { Router } from "express";
import { aiAgentController } from "../services/ai/agent/agentController.js";
import { authMiddleware } from "../middleware/auth.js";

export const agentRouter = Router();

agentRouter.get("/float-config", authMiddleware, (req, res) => aiAgentController.getFloatConfig(req, res));
agentRouter.put("/float-config", authMiddleware, (req, res) => aiAgentController.updateFloatConfig(req, res));
agentRouter.post("/float-chat", authMiddleware, (req, res) => aiAgentController.floatChat(req, res));
agentRouter.get("/field-hints", authMiddleware, (req, res) => aiAgentController.getFieldHints(req, res));
agentRouter.get("/health", authMiddleware, (req, res) => aiAgentController.getHealth(req, res));
