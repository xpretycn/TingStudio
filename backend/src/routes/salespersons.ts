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
    const id = parseInt(req.params.id);
    const result = await salespersonService.getById(id);
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
    const result = await salespersonService.query(params);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

salespersonsRouter.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await salespersonService.update(id, req.body);
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
    const id = parseInt(req.params.id);
    const deleted = await salespersonService.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Salesperson not found" });
    }
    res.json({ success: true, message: "Salesperson deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

salespersonsRouter.post("/batch-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: "ids must be an array" });
    }
    const result = await salespersonService.batchDelete(ids.map((id: any) => parseInt(id)));
    res.json({ success: true, data: result });
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
