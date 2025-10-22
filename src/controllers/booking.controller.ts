import { Response } from "express";
import Booking from "../models/Booking";
import { notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

/** GET /bookings — danh sách booking của user hiện tại */
export const listMyBookings = async (req: AuthRequest, res: Response) => {
  const list = await Booking.find({ user_id: req.user!.userId }).sort({ createdAt: -1 });
  res.json(list);
};

/** GET /bookings/:id — chi tiết 1 booking của user hiện tại */
export const getMyBooking = async (req: AuthRequest, res: Response) => {
  const booking = await Booking.findOne({ _id: req.params.id, user_id: req.user!.userId });
  if (!booking) throw notFound("Booking not found");
  res.json(booking);
};
