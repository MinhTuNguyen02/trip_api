// src/routes/webhooks/payos.routes.ts
import { Router } from "express";
import * as W from "../../controllers/payos-webhook.controller";

const r = Router();
// payOS gửi JSON bình thường -> KHÔNG dùng express.raw()
r.post("/", W.handleWebhook);
export default r;
