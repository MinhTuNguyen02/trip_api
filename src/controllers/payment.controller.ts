import { Request, Response } from "express";
import Payment from "../models/Payment";
import { AuthRequest } from "../middlewares/auth.middleware";
import crypto from "crypto";
import Booking from "../models/Booking";
import Cart from "../models/Cart";
import { env } from "../configs/env";

/** GET /payments — danh sách của user hiện tại */
export const listMyPayments = async (req: AuthRequest, res: Response) => {
  const list = await Payment.find({ user_id: req.user!.userId }).sort({ createdAt: -1 });
  res.json(list);
};

/** GET /payments/:id — chi tiết một payment của user hiện tại */
export const getMyPayment = async (req: AuthRequest, res: Response) => {
  const p = await Payment.findOne({ _id: req.params.id, user_id: req.user!.userId });
  if (!p) return res.status(404).json({ error: "Payment not found" });
  res.json(p);
};

/**
 * Webhook payOS:
 * - payOS gửi JSON + header chữ ký, ví dụ "x-signature"
 * - Ta xác thực: HMAC_SHA256(JSON.stringify(body), PAYOS_CHECKSUM_KEY) === signature
 * - Khi status là PAID/SUCCESS -> set Payment 'succeeded', tạo Booking, clear Cart (idempotent)
 */
export const payosWebhook = async (req: Request, res: Response) => {
  const signature = (req.header("x-signature") || req.header("X-Signature") || "") as string;
  const raw = JSON.stringify(req.body || {});
  const computed = crypto.createHmac("sha256", env.PAYOS_CHECKSUM_KEY).update(raw).digest("hex");

  if (!signature || signature !== computed) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Ví dụ payload từ payOS (tham chiếu docs sandbox):
  // { orderCode: 123456789, amount: 3500000, status: "PAID", ... }
  const { orderCode, status } = req.body as { orderCode?: number | string; status?: string };
  if (!orderCode) return res.status(400).json({ error: "Missing orderCode" });

  const payment = await Payment.findOne({ intent_id: String(orderCode), provider: "payos" });
  if (!payment) {
    // Có thể upsert nếu muốn, nhưng thường ta đã tạo Payment trước khi gọi createPaymentLink
    return res.status(404).json({ error: "Payment not found" });
  }

  // Map trạng thái
  const ok = ["PAID", "SUCCEEDED", "SUCCESS"].includes(String(status || "").toUpperCase());
  const failed = ["FAILED", "CANCELLED", "CANCELED"].includes(String(status || "").toUpperCase());

  if (ok) {
    if (payment.status !== "succeeded") {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "succeeded", payload: req.body } }
      );

      // Idempotent tạo Booking 1 lần
      const cart = await Cart.findOne({ user_id: payment.user_id });
      const total = cart?.items.reduce((s, i) => s + i.qty * i.unit_price, 0) ?? 0;

      await Booking.create({
        user_id: payment.user_id,
        total,
        status: "paid",
        items: cart?.items || [],
        payment_id: String(orderCode)
      });

      await Cart.updateOne({ user_id: payment.user_id }, { $set: { items: [] } });
    }
  } else if (failed) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: "failed", payload: req.body } }
    );
  }

  res.json({ ok: true });
};
