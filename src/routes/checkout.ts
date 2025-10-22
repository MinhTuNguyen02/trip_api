import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import * as Checkout from "../controllers/checkout.controller";

const r = Router();

r.post("/", requireAuth, asyncHandler(Checkout.createPaymentIntent));

export default r;
