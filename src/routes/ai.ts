import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as AI from "../controllers/ai.controller";

const r = Router();
r.post("/itinerary", asyncHandler(async (req, res) => res.json(await AI.buildItinerary(req.body))));
export default r;
