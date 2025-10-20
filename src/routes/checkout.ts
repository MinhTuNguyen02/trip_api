import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthRequest } from "../middlewares/auth.middleware";
import * as Checkout from "../controllers/checkout.controller";

const r = Router();
r.post("/", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Checkout.createPaymentIntent(req.user!.userId))));
r.post("/success", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.status(201).json({ booking: await Checkout.confirmSuccess(req.user!.userId, req.body.paymentId) })));
export default r;
