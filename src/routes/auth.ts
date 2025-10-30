import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as AuthController from "../controllers/auth.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware";

const r = Router();

r.post("/register", asyncHandler(AuthController.register));
r.post("/login", asyncHandler(AuthController.login));
r.get("/me", requireAuth, asyncHandler(AuthController.getProfile));
// NEW: cập nhật hồ sơ
r.patch("/me", requireAuth, asyncHandler(AuthController.updateProfile));
r.post("/change-password", requireAuth, asyncHandler(AuthController.changePassword));

r.get("/users",  requireAuth, requireAdmin, asyncHandler(AuthController.listUsers));
r.get("/admins", requireAuth, requireAdmin, asyncHandler(AuthController.listAdmins));
r.post("/admins", requireAuth, requireAdmin, asyncHandler(AuthController.createAdmin));
export default r;
