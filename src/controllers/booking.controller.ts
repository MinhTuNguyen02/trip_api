// src/controllers/booking.controller.ts
import { Response, Request } from "express";
import mongoose, { Types } from "mongoose";
import Booking from "../models/Booking";
import { badRequest, notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";
import Payment from "../models/Payment";
import User from "../models/User";
import Ticket from "../models/Ticket";

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

function toObjectIdMaybe(v?: string) {
  try {
    if (v && Types.ObjectId.isValid(v)) return new Types.ObjectId(v);
  } catch {}
  return null;
}

function parseDateRange(date_from?: string, date_to?: string) {
  const cond: any = {};
  if (date_from) {
    const d = new Date(date_from);
    if (!Number.isNaN(+d)) cond.$gte = d;
  }
  if (date_to) {
    const d = new Date(date_to);
    if (!Number.isNaN(+d)) {
      // end of day (local-safe bằng cách cộng 23:59:59.999)
      d.setHours(23, 59, 59, 999);
      cond.$lte = d;
    }
  }
  return Object.keys(cond).length ? cond : undefined;
}

export async function listBookings(req: Request, res: Response) {
  const {
    q = "",
    status,
    payment_status,
    date_from,
    date_to,
    page = "1",
    limit = "12",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  // Base filters
  const match: any = {};
  if (status) match.status = status;
  if (payment_status) match.payment_status = payment_status;

  const createdAtRange = parseDateRange(date_from, date_to);
  if (createdAtRange) match.createdAt = createdAtRange;

  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },

    // Join user
    {
      $lookup: {
        from: User.collection.name,
        localField: "user_id",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    // Join payment
    {
      $lookup: {
        from: Payment.collection.name,
        localField: "payment_id",
        foreignField: "_id",
        as: "payment",
        pipeline: [{ $project: { provider: 1, intent_id: 1, status: 1 } }],
      },
    },
    { $addFields: { user: { $first: "$user" }, payment: { $first: "$payment" } } },
  ];

  // Text search / id search sau khi lookup
  const orConds: any[] = [];
  const qTrim = (q || "").trim();
  if (qTrim) {
    const qId = toObjectIdMaybe(qTrim);
    if (qId) {
      orConds.push({ _id: qId });
    }
    orConds.push(
      { "user.name": { $regex: qTrim, $options: "i" } },
      { "user.email": { $regex: qTrim, $options: "i" } },
      { snapshot_title: { $regex: qTrim, $options: "i" } },
      // orderCode (intent_id) có thể là chuỗi số — match chính xác
      { "payment.intent_id": qTrim }
    );
  }
  if (orConds.length) pipeline.push({ $match: { $or: orConds } });

  pipeline.push(
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limitNum }],
        total: [{ $count: "count" }],
      },
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    }
  );

  const [resp] = await Booking.aggregate(pipeline);
  const items = (resp?.items ?? []).map((b: any) => ({
    ...b,
    // đảm bảo type sạch sẽ: toString ISO cho FE nếu cần
  }));

  return res.json({
    items,
    total: resp?.total ?? 0,
    page: pageNum,
    pages: Math.max(1, Math.ceil((resp?.total ?? 0) / limitNum)),
  });
}

/**
 * GET /api/admin/bookings/:id
 * Trả 1 booking + tickets[] + payment + user
 */
export async function getBooking(req: Request, res: Response) {
  const { id } = req.params;
  const _id = toObjectIdMaybe(id);
  if (!_id) throw badRequest("Invalid id");

  const [doc] = await Booking.aggregate([
    { $match: { _id } },

    {
      $lookup: {
        from: User.collection.name,
        localField: "user_id",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    {
      $lookup: {
        from: Payment.collection.name,
        localField: "payment_id",
        foreignField: "_id",
        as: "payment",
        pipeline: [{ $project: { provider: 1, intent_id: 1, status: 1 } }],
      },
    },
    {
      $lookup: {
        from: Ticket.collection.name,
        localField: "_id",
        foreignField: "booking_id",
        as: "tickets",
        pipeline: [
          {
            $project: {
              code: 1,
              status: 1,
              passenger: 1,
            },
          },
        ],
      },
    },
    { $addFields: { user: { $first: "$user" }, payment: { $first: "$payment" } } },
    { $limit: 1 },
  ]);

  if (!doc) throw notFound("Booking not found");
  return res.json(doc);
}