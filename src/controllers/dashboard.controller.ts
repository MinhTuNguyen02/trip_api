import { Request, Response } from "express";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import Tour from "../models/Tour";
import User from "../models/User";
import { badRequest } from "../utils/ApiError";

type RangeKind = "day" | "month" | "year";
const TZ = "+07:00";

function parseParams(req: Request) {
  const range = String(req.query.range || "month") as RangeKind;

  let start: Date | undefined;
  let end: Date | undefined;
  let year: number | undefined;

  if (range === "day") {
    const dateFrom = String(req.query.dateFrom || "");
    const dateTo   = String(req.query.dateTo   || "");
    if (!dateFrom || !dateTo) throw badRequest("Thiếu dateFrom/dateTo (range=day)");
    start = new Date(dateFrom + "T00:00:00.000Z");
    end   = new Date(dateTo   + "T23:59:59.999Z");
    const diff = (end.getTime() - start.getTime()) / (1000*60*60*24);
    if (diff < 0 || diff > 30) throw badRequest("Khoảng ngày không hợp lệ (tối đa 30 ngày)");
  }

  if (range === "month") {
    year = Number(req.query.year || new Date().getUTCFullYear());
    if (!Number.isFinite(year) || year < 1970 || year > 9999) throw badRequest("year không hợp lệ");
    start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    end   = new Date(Date.UTC(year,11,31,23,59,59,999));
  }

  // year: không ràng buộc thời gian (toàn bộ dữ liệu)
  const fmt = range === "day" ? "%Y-%m-%d" : range === "month" ? "%Y-%m" : "%Y";

  return { range, start, end, fmt };
}

const matchWindow = (start?: Date, end?: Date, field = "createdAt") =>
  start && end ? { [field]: { $gte: start, $lte: end } } : {};

// --- 1) SUMMARY: chỉ còn 2 card (tours, users role=user) ---
export async function summary(_req: Request, res: Response) {
  const [users, tours] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Tour.countDocuments(),
  ]);
  res.json({ users, tours });
}

// --- 2) SERIES: trả timeseries ĐƠN HÀNG + DOANH THU theo range ---
/**
 * GET /api/dashboard/series
 * Query:
 *  - range=day&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD   (<=30 ngày)
 *  - range=month&year=YYYY
 *  - range=year
 * Output: [{ label, orders, revenue }]
 */
export async function series(req: Request, res: Response) {
  const { range, start, end, fmt } = parseParams(req);

  const period = { $dateToString: { format: fmt, date: "$createdAt", timezone: TZ } };

  // A) Đơn hàng (Booking) — loại cancelled
  const ordersAgg = await Booking.aggregate([
    { $match: { status: { $ne: "cancelled" }, ...matchWindow(start, end, "createdAt") } },
    { $group: { _id: period, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // B) Doanh thu (Payment) — status thành công
  const revAgg = await Payment.aggregate([
    { $match: { status: { $in: ["succeeded", "paid"] }, ...matchWindow(start, end, "createdAt") } },
    { $group: { _id: period, revenue: { $sum: "$amount" } } },
    { $sort: { _id: 1 } },
  ]);

  // C) Merge theo label
  const map = new Map<string, { label: string; orders: number; revenue: number }>();
  for (const r of ordersAgg) map.set(r._id, { label: r._id, orders: r.orders || 0, revenue: 0 });
  for (const r of revAgg) {
    const cur = map.get(r._id) || { label: r._id, orders: 0, revenue: 0 };
    cur.revenue = r.revenue || 0;
    map.set(r._id, cur);
  }
  const rows = Array.from(map.values()).sort((a,b)=>a.label.localeCompare(b.label));
  res.json(rows);
}

// --- 3) TOP 10 DESTINATIONS trong khoảng đã chọn ---
/**
 * GET /api/dashboard/top-destinations
 * Query: giống /series (range/day/month/year)
 * Output: [{ destination_id, name, travellers }]
 */
export async function topDestinations(req: Request, res: Response) {
  const { start, end } = parseParams(req);

  const data = await Booking.aggregate([
    { $match: { status: { $ne: "cancelled" }, ...matchWindow(start, end, "createdAt") } },
    { $group: { _id: "$snapshot_destination_id", travellers: { $sum: "$qty" } } },
    { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
    { $unwind: { path: "$dest", preserveNullAndEmptyArrays: true } },
    { $project: {
        _id: 0,
        destination_id: "$_id",
        name: { $ifNull: ["$dest.name", "(Không rõ)"] },
        travellers: 1
      }
    },
    { $sort: { travellers: -1 } },
    { $limit: 10 },
  ]);

  res.json(data);
}
