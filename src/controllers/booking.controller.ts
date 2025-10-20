import Booking from "../models/Booking";
import { notFound } from "../utils/ApiError";

export const listMyBookings = async (userId: string) => {
  const list = await Booking.find({ user_id: userId }).sort({ createdAt: -1 });
  return list;
};

export const getMyBooking = async (userId: string, id: string) => {
  const booking = await Booking.findOne({ _id: id, user_id: userId });
  if (!booking) throw notFound("Booking not found");
  return booking;
};
