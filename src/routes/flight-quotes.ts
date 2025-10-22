import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as FController from "../controllers/flightQuote.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const r = Router();
r.get("/", asyncHandler(FController.listByItinerary));
r.post("/", requireAuth, asyncHandler(FController.createQuote));
r.delete("/:id", requireAuth, asyncHandler(FController.deleteQuote));
export default r;
