import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import * as Tours from "../controllers/tour.controller";
import * as TourOptions from "../controllers/tourOption.controller";

const r = Router();

// Public
r.get("/", asyncHandler(Tours.listTours));
r.get("/:id", asyncHandler(Tours.getTour));
r.get("/:tourId/options", asyncHandler(TourOptions.listForTour));

// Admin CRUD
r.post("/", requireAuth, requireAdmin, asyncHandler(Tours.createTour));
r.put("/:id", requireAuth, requireAdmin, asyncHandler(Tours.updateTour));
r.delete("/:id", requireAuth, requireAdmin, asyncHandler(Tours.deleteTour));

// Toggle is_active riêng (PUT cho đồng bộ)
r.put("/:id/active", requireAuth, requireAdmin, asyncHandler(Tours.toggleActive));

export default r;
