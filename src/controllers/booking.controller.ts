// src/controllers/booking.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import { notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

/** GET /bookings?page=&limit= */
export const listMyBookings = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const page  = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip  = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Booking.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "tour_id",   select: "title images price duration_hr destination_id", options: { lean: true } })
      .populate({ path: "option_id", select: "start_date start_time status",                  options: { lean: true } })
      .lean(),
    Booking.countDocuments({ user_id: userId }),
  ]);

  res.json({ items, total, page, limit });
};

/** GET /bookings/:id */
export const getMyBooking = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) throw notFound("Booking not found");

  const booking = await Booking.findOne({ _id: id, user_id: req.user!.userId })
    .populate({ path: "tour_id",   select: "title images price duration_hr destination_id", options: { lean: true } })
    .populate({ path: "option_id", select: "start_date start_time status",                  options: { lean: true } })
    .lean();

  if (!booking) throw notFound("Booking not found");
  res.json(booking);
};
