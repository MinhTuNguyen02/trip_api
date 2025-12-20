// src/controllers/checkout.controller.ts
import { Response, Request } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import crypto from "crypto";
import { PayOS } from "@payos/node";
import Cart from "../models/Cart";
import Tour from "../models/Tour";
import TourOption from "../models/TourOption";
import Booking from "../models/Booking";
import Ticket from "../models/Ticket";
import Payment from "../models/Payment";
import { badRequest, notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";
import { env } from "../configs/env";

const L = (...a: any[]) => console.log("[PAYOS]", ...a);
const J = (x: any) => JSON.stringify(x, (k, v) =>
  v && (v as any)._bsontype === "ObjectID" ? String(v) :
  v instanceof Date ? v.toISOString() : v, 2);

// ------- PayOS SDK -------
const payos = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

// ------- Zod schema -------
const phoneRegex = /^\+?[0-9]{8,15}$/;
const createCheckoutBody = z.object({
  items: z.array(z.object({
    cart_item_id: z.string().min(8),
    contact_name: z.string().trim().min(1).optional(),
    contact_phone: z.string().trim().regex(phoneRegex, "Invalid phone").optional(),
    address: z.string().trim().max(500).optional(),
  })).min(1),
});

// ------- helpers -------
function genTicketCode(prefix: string) {
  const slug = (prefix || "").replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${slug || "TKT"}-${rand}`;
}
async function tryReserve(optionId: Types.ObjectId, qty: number) {
  const r = await TourOption.updateOne(
    { _id: optionId, status: "open", $expr: { $lte: ["$capacity_sold", { $subtract: ["$capacity_total", qty] }] } },
    { $inc: { capacity_sold: qty } }
  );
  return r.modifiedCount > 0;
}

// ------- Create Checkout -------
export const createCheckout = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const body = createCheckoutBody.parse(req.body);

  const cart = await Cart.findOne({ user_id: userId }).lean();
  if (!cart || !cart.items?.length) throw badRequest("Cart empty");

  const idSet = new Set(body.items.map(i => i.cart_item_id));
  const chosen = cart.items.filter(i => idSet.has(String(i._id)));
  if (chosen.length !== body.items.length) throw badRequest("Some cart items not found");

  const enriched: any[] = [];
  let amount = 0;

  for (const it of chosen) {
    const [tour, opt] = await Promise.all([
      Tour.findById(it.ref_id).lean(),
      TourOption.findById(it.option_id).lean(),
    ]);
    if (!tour) throw notFound("Tour not found");
    if (!opt) throw notFound("Tour option not found");

    const remaining = Math.max(0, (opt.capacity_total ?? 0) - (opt.capacity_sold ?? 0));
    if (opt.status !== "open" || remaining < it.qty) {
      throw badRequest(`Option hết chỗ hoặc đóng: ${opt._id}`);
    }

    const unit_price = tour.price;
    amount += it.qty * unit_price;

    const contact = body.items.find(x => x.cart_item_id === String(it._id))!;
    enriched.push({
      cart_item_id: String(it._id),
      tour_id: String(it.ref_id),
      option_id: String(it.option_id),
      qty: it.qty,
      unit_price,
      snapshot: { tour_title: tour.title, destination_id: tour.destination_id },
      contact_name: contact.contact_name,
      contact_phone: contact.contact_phone,
      address: contact.address,
    });
  }

  if (amount <= 0) throw badRequest("Invalid amount");

  // 11 digits + 2 rand tail
  const orderCode = Number((Date.now() % 1e9).toString().padStart(9, "0")) * 100 + Math.floor(Math.random()*100);
  await Payment.create({
    provider: "payos",
    status: "created",
    amount,
    intent_id: String(orderCode),
    user_id: userId,
    payload: { items: enriched },
  });

  const description = `Trip checkout ${orderCode}`;
  const returnUrl = `${env.CLIENT_URL}/checkout/success?order=${orderCode}`;
  const cancelUrl = `${env.CLIENT_URL}/checkout/cancel?order=${orderCode}`;

  const link = await payos.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
    items: enriched.map(i => ({ name: i.snapshot?.tour_title || "Tour", quantity: i.qty, price: i.unit_price })),
  });

  res.json({
    provider: "payos",
    orderCode,
    checkoutUrl: (link as any)?.checkoutUrl,
    qrCode: (link as any)?.qrCode,
  });
};

// ------- Finalize after paid (shared) -------
async function finalizePayment(paymentId: Types.ObjectId) {
  L("finalizePayment() start", { paymentId: String(paymentId) });
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw notFound("Payment not found");
  if (payment.status === "succeeded") return;

  const payload: any = payment.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw badRequest("Payment payload empty");

  for (const [idx, it] of items.entries()) {
    const tour = await Tour.findById(it.tour_id).lean();
    const opt  = await TourOption.findById(it.option_id).lean();
    if (!tour || !opt) throw badRequest("Tour/Option missing at finalize");

    const ok = await tryReserve(new Types.ObjectId(it.option_id), it.qty);
    if (!ok) throw badRequest("Sold out while finalizing");

    const booking = await Booking.create({
      user_id: payment.user_id,
      tour_id: tour._id,
      option_id: opt._id,
      start_date: opt.start_date,
      start_time: opt.start_time,
      qty: it.qty,
      unit_price: it.unit_price,
      total: it.qty * it.unit_price,
      snapshot_title: tour.title,
      snapshot_destination_id: tour.destination_id,
      status: "confirmed",
      payment_status: "paid",
      payment_id: payment._id,
      contact_name: it.contact_name,
      contact_phone: it.contact_phone,
      note: it.address,
      pickup_note: "Lên xe của Tripify ở bến xe gần nhất",
    });

    const tickets = Array.from({ length: it.qty }, () => {
      const code = genTicketCode(tour.title);
      return {
        booking_id: booking._id,
        passenger: { name: it.contact_name, phone: it.contact_phone, address: it.address },
        code,
        qr_payload: code,
        status: "valid",
        pickup_note: "Lên xe của Tripify ở bến xe gần nhất",
      };
    });
    await Ticket.insertMany(tickets);

    await Cart.updateOne(
      { user_id: payment.user_id },
      { $pull: { items: { _id: new Types.ObjectId(it.cart_item_id) } } }
    );
  }

  await Payment.updateOne({ _id: payment._id, status: { $ne: "succeeded" } }, { $set: { status: "succeeded" } });
  L("finalizePayment() done");
}

// ------- Webhook (PayOS -> server) -------
/**
 * Mount route with `app.post("/api/webhooks/payos", express.json(), handlePayOSWebhook)`
 */
export const handlePayOSWebhook = async (req: Request, res: Response) => {
  try {
    const body: any = req.body || {};
    const orderCode = String(body?.data?.orderCode ?? body?.orderCode ?? "");
    if (!orderCode || orderCode === "123" || orderCode === "0") {
      // Ping khi lưu webhook
      return res.status(200).json({ ok: true });
    }

    // 1) Ưu tiên: xác thực bằng SDK (đúng spec mới nhất)
    let isValid = false;
    try {
      // @payos/node có sẵn hàm verifyPaymentWebhookData
      // (nếu TS chưa có type, ép any cho instance)
      isValid = (payos as any).verifyPaymentWebhookData(body) === true;
    } catch {
      isValid = false;
    }

    // 2) Fallback thủ công theo docs nếu SDK chưa có/hết hạn
    if (!isValid) {
      const checksumKey = env.PAYOS_CHECKSUM_KEY;
      const data = body?.data ?? {};
      const signature = String(body?.signature || "");

      // sort keys A->Z, mảng thì sort keys từng phần tử rồi JSON.stringify,
      // null/undefined/'null'/'undefined' -> ''
      const ordered = Object.keys(data).sort().reduce((acc: any, k) => {
        let v: any = (data as any)[k];
        if (Array.isArray(v)) {
          v = JSON.stringify(v.map((o) =>
            Object.keys(o || {}).sort().reduce((oo: any, kk) => (oo[kk] = (o as any)[kk], oo), {})
          ));
        } else if (v == null || v === "null" || v === "undefined") {
          v = "";
        }
        acc[k] = v;
        return acc;
      }, {} as any);

      const dataQueryStr = Object.keys(ordered)
        .map((k) => `${k}=${ordered[k]}`)
        .join("&");

      const computed = crypto.createHmac("sha256", checksumKey).update(dataQueryStr).digest("hex");
      isValid = computed === signature;
    }

    if (!isValid) return res.status(400).json({ ok: false, error: "Invalid signature" });

    const paidOK =
      body?.code === "00" ||
      String(body?.data?.status ?? "").toUpperCase() === "PAID" ||
      String(body?.data?.status ?? "").toUpperCase() === "SUCCEEDED" ||
      String(body?.status ?? "").toUpperCase() === "PAID";

    const failed =
      String(body?.data?.status ?? "").toUpperCase() === "FAILED" ||
      String(body?.data?.status ?? "").toUpperCase() === "CANCELLED" ||
      String(body?.status ?? "").toUpperCase() === "FAILED";

    const payment = await Payment.findOne({ intent_id: orderCode, provider: "payos" });
    if (!payment) return res.status(200).json({ ok: true });

    if (paidOK) {
      await Payment.updateOne(
        { _id: payment._id, status: { $nin: ["succeeded"] } },
        { $set: { status: "processing", "payload.gateway": body } }
      );
      await finalizePayment(payment._id as any);
      return res.json({ ok: true });
    }

    if (failed) {
      await Payment.updateOne(
        { _id: payment._id, status: { $nin: ["succeeded"] } },
        { $set: { status: "failed", "payload.gateway": body } }
      );
      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(200).json({ ok: true });
  }
};

//==========demo======================
export const createCheckoutDemo = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // dùng lại schema validate
  const body = createCheckoutBody.parse(req.body);

  // 1) Lấy giỏ và lọc item đã chọn
  const cart = await Cart.findOne({ user_id: userId }).lean();
  if (!cart || !cart.items?.length) throw badRequest("Cart empty");

  const selectedIds = new Set(body.items.map(i => i.cart_item_id));
  const chosen = cart.items.filter(i => selectedIds.has(String(i._id)));
  if (chosen.length !== body.items.length) throw badRequest("Some cart items not found");

  // 2) Enrich + validate
  const enriched: any[] = [];
  let amount = 0;
  for (const it of chosen) {
    const [tour, opt] = await Promise.all([
      Tour.findById(it.ref_id).lean(),
      TourOption.findById(it.option_id).lean(),
    ]);
    if (!tour) throw notFound("Tour not found");
    if (!opt) throw notFound("Tour option not found");

    const remaining = Math.max(0, (opt.capacity_total ?? 0) - (opt.capacity_sold ?? 0));
    if (opt.status !== "open" || remaining < it.qty) {
      throw badRequest(`Option hết chỗ hoặc đóng: ${opt._id}`);
    }

    const unit_price = tour.price;
    amount += it.qty * unit_price;

    const contact = body.items.find(x => x.cart_item_id === String(it._id))!;
    enriched.push({
      cart_item_id: String(it._id),
      tour_id: String(it.ref_id),
      option_id: String(it.option_id),
      qty: it.qty,
      unit_price,
      snapshot: { tour_title: tour.title, destination_id: tour.destination_id },
      contact_name: contact.contact_name,
      contact_phone: contact.contact_phone,
      address: contact.address,
    });
  }
  if (amount <= 0) throw badRequest("Invalid amount");

  // 3) tạo payment (status tạm "processing" cho sát thực tế)
  const orderCode =
    Number((Date.now() % 1e9).toString().padStart(9, "0")) * 100 +
    Math.floor(Math.random() * 100);

  const payment = await Payment.create({
    provider: "payos",
    status: "processing",
    amount,
    intent_id: String(orderCode),
    user_id: userId,
    payload: { items: enriched },
  });

  // 4) finalize ngay (tạo booking/ticket + trừ giỏ + mark succeeded)
  await finalizePayment(payment._id);

  // 5) trả kết quả đơn giản để FE điều hướng
  res.json({
    ok: true,
    orderCode,
    message: "Demo payment succeeded and booking/tickets created.",
  });
};