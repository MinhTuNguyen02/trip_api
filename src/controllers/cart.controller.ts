// src/controllers/cart.controller.ts
import { Response } from "express";
import { Types } from "mongoose";               // <-- thêm
import Cart from "../models/Cart";
import Tour from "../models/Tour";
import { notFound, badRequest } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

/** GET /cart */
export const getCart = async (req: AuthRequest, res: Response) => {
  const cart = await Cart.findOne({ user_id: req.user!.userId }).populate("items.ref_id");
  res.json(cart || { user_id: req.user!.userId, items: [] });
};

/** POST /cart/items  body: { ref_id, qty?, unit_price? } */
export const addCartItem = async (req: AuthRequest, res: Response) => {
  const { ref_id, qty, unit_price } = req.body as {
    ref_id: string;
    qty?: number;
    unit_price?: number;
  };

  const tour = await Tour.findById(ref_id);
  if (!tour) throw notFound("Tour not found");

  let cart = await Cart.findOne({ user_id: req.user!.userId });
  if (!cart) cart = await Cart.create({ user_id: req.user!.userId, items: [] });

  const q = Number(qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) throw badRequest("qty must be > 0");

  const refIdObj = new Types.ObjectId(ref_id);                // <-- convert string -> ObjectId

  const existing = cart.items.find(i => i.ref_id.equals(refIdObj));  // <-- so sánh ObjectId đúng chuẩn
  if (existing) {
    existing.qty += q;
  } else {
    cart.items.push({
      type: "tour",
      ref_id: refIdObj,                                       // <-- lưu ObjectId
      qty: q,
      unit_price: Number.isFinite(unit_price as number) ? Number(unit_price) : tour.price
    } as any); // (nếu TS vẫn cứng, bạn có thể bỏ as any; nhưng với interface ở trên thì không cần)
  }

  await cart.save();
  res.status(200).json(cart);
};

/** DELETE /cart/:itemId */
export const removeCartItem = async (req: AuthRequest, res: Response) => {
  const cart = await Cart.findOne({ user_id: req.user!.userId });
  if (!cart) throw notFound("Cart not found");

  const before = cart.items.length;

  // _id đã có trên ICartItem nên TS OK
  cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);

  if (cart.items.length === before) throw notFound("Cart item not found");

  await cart.save();
  res.json(cart);
};
