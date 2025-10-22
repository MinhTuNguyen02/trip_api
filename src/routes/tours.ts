import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth /*, requireAdmin*/ } from "../middlewares/auth.middleware";
import * as Tours from "../controllers/tour.controller";

const r = Router();

// Public
r.get("/",asyncHandler(Tours.listTours));
r.get("/:id",asyncHandler(Tours.getTour));

// Create/Update (tuỳ bạn bật bảo vệ: requireAuth / requireAdmin)
r.post("/",requireAuth,asyncHandler(Tours.createTour));
r.put("/:id",requireAuth,asyncHandler(Tours.updateTour));

export default r;
