import { Router } from "express";
import { aiAgentController } from "../services/ai/agent/agentController.js";

export const agentRouter = Router();

agentRouter.post("/chat", (req, res) => aiAgentController.handleChat(req, res));
agentRouter.get("/sessions", (req, res) => {
  const sessions = aiAgentController.getAllSessions();
  res.json({ success: true, data: sessions });
});
agentRouter.delete("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const deleted = aiAgentController.clearSession(sessionId);
  if (deleted) {
    res.json({ success: true, message: `Session ${sessionId} cleared` });
  } else {
    res.status(404).json({ success: false, error: "Session not found" });
  }
});
