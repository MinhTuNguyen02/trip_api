import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as Destinations from "../controllers/destination.controller";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const r = Router();

r.get("/",asyncHandler(Destinations.listDestinations));
r.get("/:id",asyncHandler(Destinations.getDestination));
r.post("/",requireAuth, requireAdmin,asyncHandler(Destinations.createDestination));

export default r;
