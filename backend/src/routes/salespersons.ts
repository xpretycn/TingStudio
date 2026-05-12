import { Router } from "express";
import { salespersonService } from "../services/business/salespersonService.js";

export const salespersonsRouter = Router();

salespersonsRouter.post("/", async (req, res) => {
  try {
    const result = await salespersonService.create(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

salespersonsRouter.get("/:id", async (req, res) => {
  try {
    const result = await salespersonService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: "Salesperson not found" });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

salespersonsRouter.get("/", async (req, res) => {
  try {
    const params = {
      ...req.query,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
    };
    const result = await salespersonService.query(params as any);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

salespersonsRouter.put("/:id", async (req, res) => {
  try {
    const result = await salespersonService.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, error: "Salesperson not found" });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

salespersonsRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await salespersonService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Salesperson not found" });
    }
    res.json({ success: true, message: "Salesperson deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

salespersonsRouter.get("/stats/summary", async (_req, res) => {
  try {
    const stats = await salespersonService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
