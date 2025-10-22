// src/controllers/checkout.controller.ts
import { Response } from "express";
import Cart from "../models/Cart";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import { badRequest, notFound } from "../utils/ApiError";
import { env } from "../configs/env";
import { AuthRequest } from "../middlewares/auth.middleware";
import { PayOS } from "@payos/node";

/**
 * payOS client
 */
const payos = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

/**
 * POST /checkout
 * - Tạo link/QR thanh toán VNĐ qua payOS
 * - Trả về checkoutUrl + qrCode + orderCode
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const cart = await Cart.findOne({ user_id: userId });
  if (!cart || cart.items.length === 0) throw badRequest("Cart empty");

  const amount = cart.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  if (amount <= 0) throw badRequest("Invalid amount");

  // orderCode: số nguyên, unique
  const orderCode = Number(String(Date.now()).slice(-9));

  await Payment.create({
    provider: "payos",
    status: "created",
    amount,
    intent_id: String(orderCode),
    user_id: userId,
    payload: {},
  });

  const description = `Trip checkout #${orderCode}`;
  const returnUrl = `${env.CLIENT_URL}/checkout/success?order=${orderCode}`;
  const cancelUrl = `${env.CLIENT_URL}/checkout/cancel?order=${orderCode}`;

  // 🔁 đổi sang v2 API
  const link = await payos.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
    items: cart.items.map(i => ({
      name: "Tour",
      quantity: i.qty,
      price: i.unit_price,
    })),
    // metadata: { userId },
  });

  res.json({
    provider: "payos",
    orderCode,
    checkoutUrl: (link as any)?.checkoutUrl,
    qrCode: (link as any)?.qrCode,
  });
};