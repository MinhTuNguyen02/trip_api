// src/routes/tourOption.route.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import * as C from "../controllers/tourOption.controller";

const r = Router();

// Admin CRUD
r.post("/",              requireAuth, requireAdmin, asyncHandler(C.create));
r.get("/:id",            requireAuth, requireAdmin, asyncHandler(C.getOne));
r.put("/:id",            requireAuth, requireAdmin, asyncHandler(C.update));
r.delete("/:id",         requireAuth, requireAdmin, asyncHandler(C.remove));

// Conveniences
r.put("/:id/status",     requireAuth, requireAdmin, asyncHandler(C.updateStatus));
r.put("/:id/capacity",   requireAuth, requireAdmin, asyncHandler(C.updateCapacity));

export default r;
