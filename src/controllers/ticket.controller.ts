// src/controllers/ticket.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Ticket";
import Booking from "../models/Booking";
import { AuthRequest } from "../middlewares/auth.middleware";
import { badRequest, notFound } from "../utils/ApiError";

/**
 * GET /tickets
 * Query: page, limit, status?, q?, booking_id?
 * Chỉ trả ticket thuộc các booking của chính user.
 */
export async function listMyTickets(req: AuthRequest, res: Response) {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);

  const {
    page = "1",
    limit = "20",
    status,
    q,
    booking_id,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const match: Record<string, any> = {};
  if (status) match.status = status;
  if (q?.trim()) {
    match.$or = [
      { code: new RegExp(q.trim(), "i") },
      { "passenger.name": new RegExp(q.trim(), "i") },
      { "passenger.phone": new RegExp(q.trim(), "i") },
    ];
  }
  if (booking_id && mongoose.isValidObjectId(booking_id)) {
    match.booking_id = new mongoose.Types.ObjectId(booking_id);
  }

  // Pipeline lấy rows
  const rows = await Ticket.aggregate([
    { $match: match },
  
    // Join booking
    {
      $lookup: {
        from: "bookings",
        localField: "booking_id",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: false } },
  
    // Chỉ vé thuộc user hiện tại
    { $match: { "booking.user_id": userId } },
  
    // ✅ JOIN với destinations thông qua snapshot_destination_id
    {
      $lookup: {
        from: "destinations",
        localField: "booking.snapshot_destination_id",
        foreignField: "_id",
        as: "dest",
      },
    },
    { $unwind: { path: "$dest", preserveNullAndEmptyArrays: true } },
  
    { $sort: { createdAt: -1 } },
  
    {
      $project: {
        _id: 1,
        code: 1,
        qr_payload: 1,
        status: 1,
        used_at: 1,
        pickup_note: 1,
        passenger: 1,
        createdAt: 1,
        updatedAt: 1,
  
        booking: {
          _id: "$booking._id",
          start_date: "$booking.start_date",
          start_time: "$booking.start_time",
          qty: "$booking.qty",
          total: "$booking.total",
          snapshot_title: "$booking.snapshot_title",
  
          // ✅ Tên đích đến lấy chuẩn từ bảng destinations
          snapshot_destination_name: { $ifNull: ["$dest.name", "(Không rõ)"] }
        }
      }
    },
  
    { $skip: skip },
    { $limit: limitNum },
  ]);

  // Pipeline đếm tổng
  const totalAgg = await Ticket.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "bookings",
        localField: "booking_id",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: false } },
    { $match: { "booking.user_id": userId } },
    { $count: "count" },
  ]);
  const total = Number(totalAgg?.[0]?.count ?? 0);

  res.json({ rows, page: pageNum, limit: limitNum, total });
}

/**
 * GET /tickets/:id
 * Lấy 1 vé của chính user, kiểm tra quyền dựa trên booking.user_id
 */
export async function getMyTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid ticket id");

  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const ticketId = new mongoose.Types.ObjectId(id);

  const rows = await Ticket.aggregate([
    { $match: { _id: ticketId } },

    // Join booking
    {
      $lookup: {
        from: "bookings",
        localField: "booking_id",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: false } },

    // Chỉ cho chủ sở hữu
    { $match: { "booking.user_id": userId } },

    // Join destination name qua snapshot_destination_id
    {
      $lookup: {
        from: "destinations",
        localField: "booking.snapshot_destination_id",
        foreignField: "_id",
        as: "dest",
      },
    },
    { $unwind: { path: "$dest", preserveNullAndEmptyArrays: true } },

    // Chuẩn hoá output
    {
      $project: {
        _id: 1,
        booking_id: 1,
        code: 1,
        qr_payload: 1,
        status: 1,
        used_at: 1,
        pickup_note: 1,
        passenger: 1,
        createdAt: 1,
        updatedAt: 1,

        booking: {
          _id: "$booking._id",
          start_date: "$booking.start_date",
          start_time: "$booking.start_time",
          qty: "$booking.qty",
          total: "$booking.total",
          snapshot_title: "$booking.snapshot_title",
          snapshot_destination_name: { $ifNull: ["$dest.name", "(Không rõ)"] },
          snapshot_destination_id: "$booking.snapshot_destination_id",
          status: "$booking.status",
          payment_status: "$booking.payment_status",
          contact_name: "$booking.contact_name",
          contact_phone: "$booking.contact_phone",
          note: "$booking.note",
          pickup_note: "$booking.pickup_note",
        },
      },
    },
  ]);

  const doc = rows[0];
  if (!doc) throw notFound("Ticket not found");

  res.json(doc);
}

/**
 * (Tuỳ chọn) GET /tickets/code/:code
 * Lấy theo mã code, vẫn phải kiểm tra quyền
 */
export async function getMyTicketByCode(req: AuthRequest, res: Response) {
  const { code } = req.params;
  if (!code?.trim()) throw badRequest("Invalid code");

  const ticket = await Ticket.findOne({ code }).lean();
  if (!ticket) throw notFound("Ticket not found");

  const booking = await Booking.findById(ticket.booking_id).lean();
  if (!booking || String(booking.user_id) !== String(req.user!.userId)) {
    throw notFound("Ticket not found");
  }

  res.json({ ...ticket, booking });
}
