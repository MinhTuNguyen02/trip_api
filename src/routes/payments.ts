import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as PController from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const r = Router();

/** Lịch sử thanh toán của user */
r.get("/", requireAuth, asyncHandler(PController.listMyPayments));
r.get("/:id", requireAuth, asyncHandler(PController.getMyPayment));

export default r;
