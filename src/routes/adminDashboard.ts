import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import * as Dashboard from "../controllers/dashboard.controller";

const r = Router();

r.get("/summary", requireAuth, requireAdmin, asyncHandler(Dashboard.summary));
r.get("/revenue", requireAuth, requireAdmin, asyncHandler(Dashboard.revenueChart));
r.get("/destinations", requireAuth, requireAdmin, asyncHandler(Dashboard.topDestinations));

export default r;
