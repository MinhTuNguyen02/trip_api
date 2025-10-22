import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as AIController from "../controllers/ai.controller";

const r = Router();

// Sinh gợi ý lịch trình bằng AI logic (từ tour & destination)
r.post("/itinerary", asyncHandler(AIController.buildItinerary));

export default r;
