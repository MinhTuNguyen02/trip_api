import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as POIController from "../controllers/poi.controller";
import { requireAuth } from "../middlewares/auth.middleware"; // dùng cho route admin

const r = Router();
r.get("/", asyncHandler(POIController.listPOIs));
r.get("/:id", asyncHandler(POIController.getPOI));

// Admin CRUD (tùy bạn gắn middleware kiểm tra role)
r.post("/", requireAuth, asyncHandler(POIController.createPOI));
r.put("/:id", requireAuth, asyncHandler(POIController.updatePOI));
r.delete("/:id", requireAuth, asyncHandler(POIController.deletePOI));

export default r;
