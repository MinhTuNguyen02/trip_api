import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as AuthController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const r = Router();

r.post("/register", asyncHandler(AuthController.register));
r.post("/login", asyncHandler(AuthController.login));
r.get("/me", requireAuth, asyncHandler(AuthController.getProfile));
// NEW: cập nhật hồ sơ
r.patch("/me", requireAuth, asyncHandler(AuthController.updateProfile));
r.post("/change-password", requireAuth, asyncHandler(AuthController.changePassword));
export default r;
