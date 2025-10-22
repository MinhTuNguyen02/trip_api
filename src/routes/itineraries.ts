import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as IController from "../controllers/itinerary.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const r = Router();
r.get("/", requireAuth, asyncHandler(IController.listMine));
r.post("/", requireAuth, asyncHandler(IController.createItinerary));
r.get("/:id", requireAuth, asyncHandler(IController.getMine));
r.delete("/:id", requireAuth, asyncHandler(IController.deleteMine));
export default r;
