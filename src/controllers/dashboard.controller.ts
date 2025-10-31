import Booking from "../models/Booking";
import User from "../models/User";
import Tour from "../models/Tour";
import Payment from "../models/Payment";
import { Request, Response } from "express";
import mongoose from "mongoose";

// --- 1) SUMMARY ---
export async function summary(_req: Request, res: Response) {
  const [users, tours, bookings, revenueAgg] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Tour.countDocuments(),
    Booking.countDocuments(),
    Payment.aggregate([
        { $match: { status: { $in: ["succeeded", "paid"] } } },
      { $group: { _id: null, revenue: { $sum: "$amount" } } }
    ])
  ]);

  res.json({
    users,
    tours,
    bookings,
    revenue: revenueAgg[0]?.revenue || 0
  });
}


// --- 2) REVENUE CHART (theo ngày / tháng / năm) ---
export async function revenueChart(req: Request, res: Response) {
  const range = req.query.range || "month"; // day | month | year

  const groupFormat: Record<string, any> = {
    day:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    month: { $dateToString: { format: "%Y-%m",    date: "$createdAt" } },
    year:  { $dateToString: { format: "%Y",       date: "$createdAt" } },
  };

  const data = await Payment.aggregate([
    { $match: { status: { $in: ["succeeded", "paid"] } } },
    { $group: { _id: groupFormat[range as string], revenue: { $sum: "$amount" } } },
    { $sort: { _id: 1 } }
  ]);

  res.json(data);
}


// --- 3) TOP DESTINATIONS ---
export async function topDestinations(_req: Request, res: Response) {
    const data = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
  
      // gộp theo đích đến, cộng tổng qty (số khách)
      { $group: {
          _id: "$snapshot_destination_id",
          travellers: { $sum: "$qty" },
        }
      },
  
      // lấy tên đích đến
      { $lookup: {
          from: "destinations",
          localField: "_id",
          foreignField: "_id",
          as: "dest"
        }
      },
      { $unwind: { path: "$dest", preserveNullAndEmptyArrays: true } },
  
      // Chuẩn hoá output cho FE
      { $project: {
          _id: 0,
          destination_id: "$_id",
          name: { $ifNull: ["$dest.name", "(Không rõ)"] },
          travellers: 1
        }
      },
  
      { $sort: { travellers: -1 } },
      { $limit: 10 }
    ]);
  
    res.json(data);
  }