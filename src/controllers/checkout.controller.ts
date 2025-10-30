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

// ---------- Helpers: logger + json-safe ----------
const J = (x: any) =>
  JSON.stringify(
    x,
    (k, v) =>
      v && (v as any)._bsontype === "ObjectID"
        ? String(v)
        : v instanceof Date
        ? v.toISOString()
        : v,
    2
  );

// ---------- PayOS SDK ----------
const payos = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

const phoneRegex = /^\+?[0-9]{8,15}$/;

const createCheckoutBody = z.object({
  items: z
    .array(
      z.object({
        cart_item_id: z.string().min(8),
        contact_name: z.string().trim().min(1).optional(),
        contact_phone: z.string().trim().regex(phoneRegex, "Invalid phone").optional(),
        address: z.string().trim().max(500).optional(),
      })
    )
    .min(1),
});

// ---------- Utilities ----------
function genTicketCode(prefix: string) {
  const slug = (prefix || "").replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${slug || "TKT"}-${rand}`;
}

// Atomic reserve seats
async function tryReserve(optionId: Types.ObjectId, qty: number) {
  const res = await TourOption.updateOne(
    {
      _id: optionId,
      status: "open",
      $expr: { $lte: ["$capacity_sold", { $subtract: ["$capacity_total", qty] }] },
    },
    { $inc: { capacity_sold: qty } }
  );
  return res.modifiedCount > 0;
}

// ---------- Create Checkout ----------
/**
 * POST /checkout
 * body: { items: [{ cart_item_id, contact_name?, contact_phone?, address? }] }
 * -> tạo Payment + link PayOS
 */
export const createCheckout = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const body = createCheckoutBody.parse(req.body);

  // 1) Lấy giỏ + lọc theo cart_item_id
  const cart = await Cart.findOne({ user_id: userId }).lean();
  if (!cart || !cart.items?.length) throw badRequest("Cart empty");

  const selectedIds = new Set(body.items.map((i) => i.cart_item_id));
  const chosen = cart.items.filter((i) => selectedIds.has(String(i._id)));
  if (chosen.length !== body.items.length) throw badRequest("Some cart items not found");

  // 2) Enrich & validate từng item
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

    const unit_price = tour.price; // chốt giá tại thời điểm tạo checkout
    amount += it.qty * unit_price;

    const contact = body.items.find((x) => x.cart_item_id === String(it._id))!;
    enriched.push({
      cart_item_id: String(it._id),
      tour_id: String(it.ref_id),
      option_id: String(it.option_id),
      qty: it.qty,
      unit_price,
      snapshot: {
        tour_title: tour.title,
        destination_id: tour.destination_id,
      },
      contact_name: contact.contact_name,
      contact_phone: contact.contact_phone,
      address: contact.address,
    });
  }

  if (amount <= 0) throw badRequest("Invalid amount");

  // 3) Tạo Payment (orderCode 11 chữ số + 2 số rand để giảm trùng)
  const orderCode =
    Number((Date.now() % 1e9).toString().padStart(9, "0")) * 100 +
    Math.floor(Math.random() * 100);

  const payment = await Payment.create({
    provider: "payos",
    status: "created",
    amount,
    intent_id: String(orderCode),
    user_id: userId,
    payload: { items: enriched }, // để webhook finalize
  });

  // 4) Tạo link PayOS
  const description = `Trip checkout ${orderCode}`;
  const returnUrl = `${env.CLIENT_URL}/checkout/success?order=${orderCode}`;
  const cancelUrl = `${env.CLIENT_URL}/checkout/cancel?order=${orderCode}`;

  const link = await payos.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
    items: enriched.map((i) => ({
      name: i.snapshot?.tour_title || "Tour",
      quantity: i.qty,
      price: i.unit_price,
    })),
  });

  res.json({
    provider: "payos",
    orderCode,
    checkoutUrl: (link as any)?.checkoutUrl,
    qrCode: (link as any)?.qrCode,
  });
};

// ---------- Finalize ----------
/**
 * Sau khi PayOS báo "paid": tạo Booking & Tickets, trừ chỗ, xoá cart items
 */
async function finalizePayment(paymentId: Types.ObjectId) {
  L("finalizePayment() start", { paymentId: String(paymentId) });

  const payment = await Payment.findById(paymentId).lean();
  if (!payment) {
    L("finalizePayment: payment not found");
    throw notFound("Payment not found");
  }
  L("finalizePayment: payment doc", {
    _id: String(payment._id),
    status: payment.status,
    amount: payment.amount,
    intent_id: payment.intent_id,
    user_id: String(payment.user_id),
  });

  if (payment.status === "succeeded") {
    L("finalizePayment: already succeeded -> exit");
    return;
  }

  // Lấy items gốc đã lưu lúc createCheckout
  const payload: any = payment.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  L("finalizePayment: payload overview", {
    hasItems: items.length > 0,
    itemsCount: items.length,
    hasGateway: !!payload.gateway,
  });
  if (!items.length) {
    L("finalizePayment: ERROR missing items", J(payload));
    throw badRequest("Payment payload empty");
  }

  for (const [idx, it] of items.entries()) {
    L(`finalizePayment: item[${idx}]`, J(it));

    const tour = await Tour.findById(it.tour_id).lean();
    const opt = await TourOption.findById(it.option_id).lean();
    L(`finalizePayment: fetched tour/opt[${idx}]`, {
      tourFound: !!tour,
      optFound: !!opt,
      tourId: tour?._id ? String(tour._id) : null,
      optId: opt?._id ? String(opt._id) : null,
      optStatus: opt?.status,
      optSold: opt?.capacity_sold,
      optTotal: opt?.capacity_total,
    });
    if (!tour || !opt) throw badRequest("Tour/Option missing at finalize");

    // giữ chỗ atomically
    const ok = await tryReserve(new Types.ObjectId(it.option_id), it.qty);
    L(`finalizePayment: tryReserve[${idx}]`, { ok });
    if (!ok) throw badRequest("Sold out while finalizing");

    // tạo booking
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
      pickup_note: "Lên xe của Raumanian ở bến xe gần nhất",
    });
    L(`finalizePayment: booking created[${idx}]`, {
      bookingId: String(booking._id),
      total: booking.total,
    });

    // tạo tickets
    const tickets = Array.from({ length: it.qty }, () => {
      const code = genTicketCode(tour.title);
      return {
        booking_id: booking._id,
        passenger: {
          name: it.contact_name,
          phone: it.contact_phone,
          address: it.address,
        },
        code,
        qr_payload: code,
        status: "valid",
        pickup_note: "Lên xe của Raumanian ở bến xe gần nhất",
      };
    });
    const ins = await Ticket.insertMany(tickets);
    L(`finalizePayment: tickets inserted[${idx}]`, { count: ins.length });

    // xoá item khỏi giỏ
    const pullRes = await Cart.updateOne(
      { user_id: payment.user_id },
      { $pull: { items: { _id: new Types.ObjectId(it.cart_item_id) } } }
    );
    L(`finalizePayment: cart pull[${idx}]`, pullRes);
  }

  // mark payment succeeded
  const upd = await Payment.updateOne(
    { _id: payment._id, status: { $ne: "succeeded" } },
    { $set: { status: "succeeded" } }
  );
  L("finalizePayment: mark succeeded", upd);

  L("finalizePayment() done");
}


const L = (...a: any[]) => console.log("[PAYOS]", ...a);

function hmacHex(s: string, key: string) {
  return crypto.createHmac("sha256", key).update(s).digest("hex");
}
// sort keys shallow
function sortKeys(o: any) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(o || {}).sort()) out[k] = o[k];
  return out;
}
function toQuerySorted(o: any) {
  return Object.keys(o || {})
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(o[k] ?? ""))}`)
    .join("&");
}
function toPipeSorted(o: any) {
  return Object.keys(o || {})
    .sort()
    .map(k => `${k}=${String(o[k] ?? "")}`)
    .join("|");
}

/**
 * POST /api/webhooks/payos
 */
export const handlePayOSWebhook = async (req: Request, res: Response) => {
  try {
    // raw body (có nếu đã mount express.raw trước express.json)
    const rawBody =
      Buffer.isBuffer((req as any).body)
        ? (req as any).body.toString("utf8")
        : (typeof (req as any).body === "string" ? (req as any).body : "");

    // cố gắng parse nếu middleware khác
    const body: any = rawBody ? JSON.parse(rawBody) : (req.body || {});
    const data = body?.data ?? {};

    const orderCode = String(body?.orderCode ?? data?.orderCode ?? "");
    const codeStr   = String(body?.code ?? "");
    const statusUp  = String(body?.status ?? data?.status ?? "").toUpperCase();

    const headerSig = String(req.header("x-signature") || req.header("X-Signature") || "");
    const bodySig   = String(body?.signature || "");
    const key       = env.PAYOS_CHECKSUM_KEY;

    L("WEBHOOK IN", {
      path: req.originalUrl,
      orderCode, codeStr, statusUp,
      hasHeaderSig: !!headerSig,
      hasBodySig:   !!bodySig,
      rawLen: rawBody.length,
    });

    // ---- Tạo các ứng viên chữ ký (candidate) ----
    // 1) HMAC trên raw JSON (khi PayOS ký toàn bộ body)
    const cand: Record<string,string> = {};
    try { cand["rawBody"]            = hmacHex(rawBody, key); } catch {}

    // 2) HMAC trên JSON.stringify(body) (minified)
    try { cand["jsonBody"]           = hmacHex(JSON.stringify(body), key); } catch {}

    // 3) HMAC trên JSON.stringify(data) (minified)
    try { cand["jsonData"]           = hmacHex(JSON.stringify(data), key); } catch {}

    // 4) HMAC trên JSON.stringify(data đã sort key)
    try { cand["jsonDataStable"]     = hmacHex(JSON.stringify(sortKeys(data)), key); } catch {}

    // 5) Nhiều nguồn của PayOS bỏ 2 field phụ `code`/`desc` trong data khi ký
    const { code: _dc, desc: _dd, ...dataNoCd } = data || {};

    // 5a) JSON.stringify(dataNoCd) minified
    try { cand["jsonDataNoCd"]       = hmacHex(JSON.stringify(dataNoCd), key); } catch {}
    // 5b) JSON.stringify(dataNoCd) với key sort
    try { cand["jsonDataNoCdStable"] = hmacHex(JSON.stringify(sortKeys(dataNoCd)), key); } catch {}

    // 6) Kiểu ký bằng querystring (keys sort A→Z)
    try { cand["qsDataNoCd"]         = hmacHex(toQuerySorted(dataNoCd), key); } catch {}

    // 7) Kiểu ký bằng pipe-join k=v|k2=v2 (keys sort A→Z)
    try { cand["pipeDataNoCd"]       = hmacHex(toPipeSorted(dataNoCd), key); } catch {}

    // So khớp
    const headerMatch = headerSig &&
      Object.values(cand).some(v => v.toLowerCase() === headerSig.toLowerCase());

    const bodyMatch = bodySig &&
      Object.values(cand).some(v => v.toLowerCase() === bodySig.toLowerCase());

    const isValid = !!(headerMatch || bodyMatch);

    L("SIG CHECK", {
      headerSig,
      bodySig,
      matched: headerMatch ? "x-signature" : (bodyMatch ? "body.signature" : "none"),
      // show vài candidate tiêu biểu để debug
      sample: Object.entries(cand).slice(0, 6),
      isValid,
    });

    // Ping mặc định khi lưu webhook (orderCode rỗng/123/0) → chỉ ACK
    if (!orderCode || orderCode === "123" || orderCode === "0") {
      L("PING/TEST -> ACK");
      return res.status(200).json({ ok: true });
    }

    // BẮT BUỘC chữ ký hợp lệ cho giao dịch thật
    if (!isValid) {
      L("INVALID SIGNATURE -> 400");
      return res.status(400).json({ ok: false, error: "Invalid signature" });
    }

    // Quyết định trạng thái
    const paidOK =
      codeStr === "00" || statusUp === "PAID" || statusUp === "SUCCEEDED" || statusUp === "SUCCESS";
    const failed =
      statusUp === "FAILED" || statusUp === "CANCELLED" || statusUp === "CANCELED";

    // Tìm payment theo intent_id = orderCode
    const payment = await Payment.findOne({ intent_id: orderCode, provider: "payos" });
    if (!payment) {
      L("Payment not found -> ACK (no finalize)", { orderCode });
      return res.status(200).json({ ok: true });
    }

    L("FOUND PAYMENT", {
      _id: String(payment._id),
      status: payment.status,
      amount: payment.amount,
      hasItems: Array.isArray(payment.payload?.items),
    });

    if (paidOK) {
      const moved = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $nin: ["succeeded"] } },
        { $set: { status: "processing", "payload.gateway": body } },
        { new: true }
      ).lean();

      L("MOVE->processing", moved ? { _id: String(moved._id), status: moved.status } : "no-op");
      if (!moved || moved.status === "succeeded") return res.json({ ok: true });

      try {
        await finalizePayment(new Types.ObjectId(payment._id));
        L("FINALIZE DONE");
      } catch (e: any) {
        L("FINALIZE ERROR", e?.stack || e?.message || e);
      }
      return res.json({ ok: true });
    }

    if (failed) {
      await Payment.updateOne(
        { _id: payment._id, status: { $nin: ["succeeded"] } },
        { $set: { status: "failed", "payload.gateway": body } }
      );
      L("MARK FAILED");
      return res.json({ ok: true });
    }

    L("NEUTRAL -> ACK");
    return res.json({ ok: true });
  } catch (e: any) {
    L("WEBHOOK ERROR", e?.stack || e?.message || e);
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