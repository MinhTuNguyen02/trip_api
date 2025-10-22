import { Request, Response } from "express";
import crypto from "crypto";
import Payment from "../models/Payment";
import Booking from "../models/Booking";
import Cart from "../models/Cart";
import { env } from "../configs/env";

/**
 * Tùy nhà cung cấp, chữ ký có thể nằm ở header (vd: x-signature)
 * hoặc tính trên body. Ví dụ dưới đây mô phỏng cách xác thực:
 *   signature = HMAC_SHA256(JSON.stringify(body), PAYOS_CHECKSUM_KEY)
 * Bạn cần đối chiếu đúng tài liệu payOS sandbox của bạn.
 */
function verifySignature(body: any, signature?: string) {
  if (!signature) return false;
  const raw = JSON.stringify(body);
  const hash = crypto.createHmac("sha256", env.PAYOS_CHECKSUM_KEY).update(raw).digest("hex");
  return hash === signature;
}

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.header("x-signature") || req.header("X-Signature") || "";
    const valid = verifySignature(req.body, signature);
    if (!valid) return res.status(400).json({ error: "Invalid signature" });

    // Ví dụ payload (tuỳ provider):
    // { orderCode: 123456789, amount: 3500000, status: "PAID", ... }
    const { orderCode, status } = req.body;
    if (!orderCode) return res.status(400).json({ error: "Missing orderCode" });

    // Idempotent update
    const payment = await Payment.findOne({ intent_id: String(orderCode), provider: "payos" });
    if (!payment) {
      // Nếu muốn: upsert payment ở đây
      return res.status(404).json({ error: "Payment not found" });
    }

    if (status === "PAID" || status === "SUCCEEDED" || status === "SUCCESS") {
      if (payment.status !== "succeeded") {
        await Payment.updateOne(
          { _id: payment._id },
          { $set: { status: "succeeded", payload: req.body } }
        );

        // Tạo booking & clear cart (idempotent: tạo 1 lần)
        const cart = await Cart.findOne({ user_id: payment.user_id });
        const total = cart?.items.reduce((s, i) => s + i.qty * i.unit_price, 0) || 0;

        await Booking.create({
          user_id: payment.user_id,
          total,
          status: "paid",
          items: cart?.items || [],
          payment_id: String(orderCode)
        });

        await Cart.updateOne({ user_id: payment.user_id }, { $set: { items: [] } });
      }
    } else if (status === "CANCELLED" || status === "FAILED") {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "failed", payload: req.body } }
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Webhook error" });
  }
};