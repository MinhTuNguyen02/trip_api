import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as POIController from "../controllers/poi.controller";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const r = Router();

// Public
r.get("/", asyncHandler(POIController.listPOIs));
r.get("/:id", asyncHandler(POIController.getPOI));

// Admin CRUD
r.post("/", requireAuth, requireAdmin, asyncHandler(POIController.createPOI));
r.put("/:id", requireAuth, requireAdmin, asyncHandler(POIController.updatePOI));
r.delete("/:id", requireAuth, requireAdmin, asyncHandler(POIController.deletePOI));

// Toggle is_active (PUT cho đồng bộ, ép boolean)
r.put("/:id/active", requireAuth, requireAdmin, asyncHandler(POIController.toggleActive));

export default r;
