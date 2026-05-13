import { Router } from "express";
import { aiAgentController } from "../services/ai/agent/agentController.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";

export const agentRouter = Router();

agentRouter.post("/chat", authMiddleware, (req, res) => aiAgentController.handleChat(req, res));
agentRouter.post("/submit-form", authMiddleware, (req, res) => aiAgentController.submitForm(req, res));
agentRouter.get("/pending-form/:sessionId", authMiddleware, (req, res) => aiAgentController.getPendingForm(req, res));
agentRouter.get("/sessions", authMiddleware, (req, res) => aiAgentController.getSessions(req, res));
agentRouter.get("/sessions/:sessionId", authMiddleware, (req, res) => aiAgentController.getSessionMessages(req, res));
agentRouter.delete("/sessions/:sessionId", authMiddleware, (req, res) => aiAgentController.deleteSession(req, res));
agentRouter.get("/role-config", authMiddleware, (req, res) => aiAgentController.getRoleConfig(req, res));
agentRouter.put("/role-config", authMiddleware, (req, res) => aiAgentController.updateRoleConfig(req, res));
