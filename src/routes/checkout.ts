// src/routes/checkout.route.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import * as Checkout from "../controllers/checkout.controller";

const r = Router();

r.post("/", requireAuth, asyncHandler(Checkout.createCheckout));
r.post("/demo", requireAuth, asyncHandler(Checkout.createCheckoutDemo));

export default r;
