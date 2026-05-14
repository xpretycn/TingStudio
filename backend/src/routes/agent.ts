import { Router } from "express";
import { aiAgentController } from "../services/ai/agent/agentController.js";
import { agentChatController } from "../services/ai/agent/agentChatController.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";

export const agentRouter = Router();

agentRouter.post("/chat", authMiddleware, (req, res) => agentChatController.handleChat(req, res));
agentRouter.post("/submit-form", authMiddleware, (req, res) => aiAgentController.submitForm(req, res));
agentRouter.get("/pending-form/:sessionId", authMiddleware, (req, res) => aiAgentController.getPendingForm(req, res));
agentRouter.get("/sessions", authMiddleware, (req, res) => aiAgentController.getSessions(req, res));
agentRouter.get("/sessions/:sessionId", authMiddleware, (req, res) => aiAgentController.getSessionMessages(req, res));
agentRouter.delete("/sessions/:sessionId", authMiddleware, (req, res) => aiAgentController.deleteSession(req, res));
agentRouter.get("/role-config", authMiddleware, (req, res) => aiAgentController.getRoleConfig(req, res));
agentRouter.put("/role-config", authMiddleware, (req, res) => aiAgentController.updateRoleConfig(req, res));
agentRouter.get("/float-config", authMiddleware, (req, res) => aiAgentController.getFloatConfig(req, res));
agentRouter.put("/float-config", authMiddleware, (req, res) => aiAgentController.updateFloatConfig(req, res));
agentRouter.post("/parse-form", authMiddleware, (req, res) => aiAgentController.parseForm(req, res));
agentRouter.post("/float-chat", authMiddleware, (req, res) => aiAgentController.floatChat(req, res));
agentRouter.post("/generate-description", authMiddleware, (req, res) => aiAgentController.generateDescription(req, res));
agentRouter.get("/field-hints", authMiddleware, (req, res) => aiAgentController.getFieldHints(req, res));
agentRouter.get("/health", authMiddleware, (req, res) => aiAgentController.getHealth(req, res));
