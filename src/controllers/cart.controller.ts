import Cart from "../models/Cart";
import Tour from "../models/Tour";
import { notFound, badRequest } from "../utils/ApiError";

export const getCart = async (userId: string) => {
  const cart = await Cart.findOne({ user_id: userId }).populate("items.ref_id");
  return cart || { user_id: userId, items: [] };
};

export const addCartItem = async (userId: string, body: any) => {
  const { ref_id, qty, unit_price } = body;
  const tour = await Tour.findById(ref_id);
  if (!tour) throw notFound("Tour not found");

  let cart = await Cart.findOne({ user_id: userId });
  if (!cart) cart = await Cart.create({ user_id: userId, items: [] });

  const q = Number(qty ?? 1);
  if (q <= 0) throw badRequest("qty must be > 0");

  const existing = cart.items.find(i => i.ref_id.toString() === ref_id);
  if (existing) existing.qty += q;
  else cart.items.push({
    type: "tour",
    ref_id,
    qty: q,
    unit_price: Number(unit_price ?? tour.price)
  });

  await cart.save();
  return cart;
};

export const removeCartItem = async (userId: string, itemId: string) => {
  const cart = await Cart.findOne({ user_id: userId });
  if (!cart) throw notFound("Cart not found");
  cart.items = cart.items.filter(i => i._id!.toString() !== itemId);
  await cart.save();
  return cart;
};
