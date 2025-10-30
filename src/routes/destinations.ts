import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as Destinations from "../controllers/destination.controller";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const r = Router();

r.get("/", asyncHandler(Destinations.listDestinations));
r.get("/:id", asyncHandler(Destinations.getDestination));

r.post("/", requireAuth, requireAdmin, asyncHandler(Destinations.createDestination));
r.put("/:id", requireAuth, requireAdmin, asyncHandler(Destinations.updateDestination));
r.delete("/:id", requireAuth, requireAdmin, asyncHandler(Destinations.deleteDestination));
r.put("/:id/active-hard", requireAuth, requireAdmin, asyncHandler(Destinations.setActiveHard));
export default r;
