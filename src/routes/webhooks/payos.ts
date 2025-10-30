// src/routes/webhooks/payos.routes.ts
import { Router } from "express";
import * as Checkout from "../../controllers/checkout.controller";

const r = Router();
r.get("/", (_req, res) => res.json({ ok: true }));
// payOS gửi JSON bình thường -> KHÔNG dùng express.raw()
r.post("/", Checkout.handlePayOSWebhook);
export default r;
