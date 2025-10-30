// src/controllers/cart.controller.ts
import { Response } from "express";
import { Types } from "mongoose";
import Cart from "../models/Cart";
import Tour from "../models/Tour";
import TourOption from "../models/TourOption";
import { badRequest, notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

/** --------- Helpers --------- */
const HHmm = /^\d{2}:\d{2}$/;

const populateCart = (q: any) =>
  Cart.findOne(q)
    .populate([
      { path: "items.ref_id",    select: "title price images", options: { lean: true } },
      { path: "items.option_id", select: "start_date start_time status", options: { lean: true } },
    ])
    .lean();

function toUTCDateOnly(s: string | Date) {
  if (s instanceof Date) return s;
  const d = new Date(s + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) throw badRequest("Invalid date");
  return d;
}

function nowUTC() {
  return new Date();
}

function checkCutOff(opt: { start_date: Date; start_time?: string; cut_off_hours?: number }) {
  const time = typeof opt.start_time === "string" && HHmm.test(opt.start_time) ? opt.start_time : "00:00";
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(opt.start_date);
  start.setUTCHours(hh || 0, mm || 0, 0, 0);
  const cutHours = Math.max(0, Number(opt.cut_off_hours ?? 2));
  const cutoff = new Date(start.getTime() - cutHours * 60 * 60 * 1000);
  return nowUTC() > cutoff;
}

/** --------- GET /cart --------- */
export const getCart = async (req: AuthRequest, res: Response) => {
  const cart = await populateCart({ user_id: req.user!.userId });
  res.json(cart || { user_id: req.user!.userId, items: [] });
};

/** --------- POST /cart/items ---------
 * body: {
 *   type: "tour",
 *   ref_id: string,      // Tour._id
 *   option_id: string,   // TourOption._id
 *   qty?: number
 * }
 */
export const addCartItem = async (req: AuthRequest, res: Response) => {
  const { type, ref_id, option_id, qty } = req.body as {
    type: "tour";
    ref_id: string;
    option_id: string;
    qty?: number;
  };

  if (type !== "tour") throw badRequest("Unsupported item type");

  const q = Number(qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) throw badRequest("qty must be > 0");

  const tourId = new Types.ObjectId(ref_id);
  const optId  = new Types.ObjectId(option_id);

  // 1) Kiểm tra tour tồn tại
  const tour = await Tour.findById(tourId).lean();
  if (!tour) throw notFound("Tour not found");

  // 2) Kiểm tra option thuộc tour + điều kiện bán
  const opt = await TourOption.findById(optId).lean();
  if (!opt || String(opt.tour_id) !== String(tourId)) throw notFound("Tour option not found");

  // tính remaining & các điều kiện chặn
  const remaining = Math.max(0, (opt.capacity_total ?? 0) - (opt.capacity_sold ?? 0));
  const cutOff = checkCutOff({
    start_date: toUTCDateOnly(opt.start_date),
    start_time: opt.start_time,
    cut_off_hours: opt.cut_off_hours,
  });

  if (opt.status !== "open") throw badRequest("This option is not open for booking");
  if (cutOff) throw badRequest("This option has passed the cut-off time");
  if (remaining <= 0) throw badRequest("This option is fully booked");
  if (q > remaining) throw badRequest(`Only ${remaining} seats left for this option`);

  // 3) Ghi giỏ: nếu đã có item cùng (tour, option) thì +qty, ngược lại push item mới
  const user_id = req.user!.userId;

  const incRes = await Cart.updateOne(
    { user_id, "items.ref_id": tourId, "items.option_id": optId },
    { $inc: { "items.$.qty": q } }
  );

  if (incRes.matchedCount === 0) {
    await Cart.updateOne(
      { user_id },
      {
        $push: {
          items: {
            type: "tour",
            ref_id: tourId,
            option_id: optId,
            qty: q,
            unit_price: tour.price, // 1 nguồn giá
          },
        },
      },
      { upsert: true }
    );
  }

  // 4) Trả cart đã populate
  const fresh = await populateCart({ user_id });
  res.json(fresh);
};

/** --------- PUT /cart/items/:itemId ---------
 * body: { qty: number > 0 }
 * (Đơn giản: cập nhật số lượng. Nếu muốn chặt chẽ hơn, bạn có thể bổ sung kiểm tra remaining tương tự addCartItem)
 */
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  const qty = Number((req.body as any)?.qty);
  if (!Number.isFinite(qty) || qty <= 0) throw badRequest("qty must be > 0");

  const user_id = req.user!.userId;
  const itemId = req.params.itemId;

  const upd = await Cart.updateOne(
    { user_id, "items._id": itemId },
    { $set: { "items.$.qty": qty } }
  );
  if (upd.matchedCount === 0) throw notFound("Cart item not found");

  const fresh = await populateCart({ user_id });
  res.json(fresh);
};

/** --------- DELETE /cart/:itemId --------- */
export const removeCartItem = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.userId;
  const { itemId } = req.params;

  const updated = await Cart.findOneAndUpdate(
    { user_id },
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  if (!updated) throw notFound("Cart item not found");

  const cart = await populateCart({ _id: updated._id });
  res.json(cart);
};
