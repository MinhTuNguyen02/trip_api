import Stripe from "stripe";
import Cart from "../models/Cart";
import Booking from "../models/Booking";
import { badRequest, notFound } from "../utils/ApiError";
import { env } from "../configs/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY as string);

export const createPaymentIntent = async (userId: string) => {
  const cart = await Cart.findOne({ user_id: userId });
  if (!cart || cart.items.length === 0) throw badRequest("Cart empty");

  const amount = cart.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "vnd",
    automatic_payment_methods: { enabled: true },
    metadata: { userId }
  });
  return { clientSecret: paymentIntent.client_secret };
};

export const confirmSuccess = async (userId: string, paymentId: string) => {
  if (!paymentId) throw badRequest("paymentId required");

  const cart = await Cart.findOne({ user_id: userId });
  if (!cart) throw notFound("Cart not found");
  const total = cart.items.reduce((s, i) => s + i.qty * i.unit_price, 0);

  const booking = await Booking.create({
    user_id: userId,
    total,
    status: "paid",
    items: cart.items,
    payment_id: paymentId
  });

  await Cart.updateOne({ user_id: userId }, { $set: { items: [] } });
  return booking;
};
