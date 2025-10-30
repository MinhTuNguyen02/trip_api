import { Request, Response } from "express";
import { z } from "zod";
import Tour from "../models/Tour";
import TourOption from "../models/TourOption";
import { AuthRequest } from "../middlewares/auth.middleware";
import { badRequest, notFound } from "../utils/ApiError";

// ----------------- helpers -----------------


function toDateOnlyUTC(s: string) {
  // parse yyyy-mm-dd -> Date(UTC midnight)
  const d = new Date(s + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

function nowUTC() {
  return new Date();
}

/** isDisabled logic cho client: full | closed | cancelled | hết chỗ | quá cut-off */
function buildOptionView(o: any) {
  const remaining = Math.max(0, (o.capacity_total ?? 0) - (o.capacity_sold ?? 0));

  // Tính cut-off
  let isCutOff = false;
  if (o.cut_off_hours && o.start_date) {
    const time = typeof o.start_time === "string" && HHmm.test(o.start_time) ? o.start_time : "00:00";
    const [hh, mm] = time.split(":").map(Number);
    const start = new Date(o.start_date);
    start.setUTCHours(hh, mm ?? 0, 0, 0);
    const cutoff = new Date(start.getTime() - (o.cut_off_hours * 60 * 60 * 1000));
    isCutOff = nowUTC() > cutoff;
  }

  const isDisabled = o.status !== "open" || remaining <= 0 || isCutOff;

  return {
    ...o,
    remaining,
    isDisabled,
  };
}

// ----------------- zod schemas -----------------
const HHmm = /^([01]\d|2[0-3]):[0-5]\d$/; // cũng sửa regex chuẩn 24h luôn
import mongoose from "mongoose";
const isObjectId = (v: unknown) => typeof v === "string" && mongoose.isValidObjectId(v);
const baseBody = z.object({
  tour_id: z.string().refine(isObjectId, "Invalid tour_id"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start_date must be YYYY-MM-DD"),
  start_time: z
    .string()
    .regex(HHmm, "HH:mm")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  capacity_total: z.coerce.number().int().min(1),
  capacity_sold: z.coerce.number().int().min(0).default(0),
  cut_off_hours: z.coerce.number().int().min(0).optional(),
  status: z.enum(["open", "full", "closed", "cancelled"]).optional(),
});

const createBody = baseBody;
const updateBody = baseBody.partial().strict();

// ----------------- Public: list options for a tour -----------------
/**
 * GET /tours/:tourId/options?from=YYYY-MM-DD&to=YYYY-MM-DD&onlyOpen=1
 * - Public: trả danh sách option của tour
 * - Tự động trả kèm: remaining, isDisabled
 */
export const listForTour = async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const { from, to, onlyOpen } = req.query as {
    from?: string;
    to?: string;
    onlyOpen?: string;
  };

  if (!tourId) throw badRequest("Missing tourId");
  const tour = await Tour.findById(tourId).lean();
  if (!tour) throw notFound("Tour not found");

  const q: any = { tour_id: tourId };
  if (from) q.start_date = { ...(q.start_date || {}), $gte: toDateOnlyUTC(from) };
  if (to)   q.start_date = { ...(q.start_date || {}), $lte: toDateOnlyUTC(to) };
  if (onlyOpen === "1") q.status = "open";

  const items = await TourOption.find(q).sort({ start_date: 1, start_time: 1 }).lean();
  res.json(items.map(buildOptionView));
};

// ----------------- Admin: CRUD -----------------

/** POST /tour-options */
export const create = async (req: AuthRequest, res: Response) => {
  const data = createBody.parse(req.body);

  // ensure tour exists
  const tour = await Tour.findById(data.tour_id);
  if (!tour) throw notFound("Tour not found");

  const doc = await TourOption.create({
    tour_id: data.tour_id,
    start_date: toDateOnlyUTC(data.start_date),
    start_time: data.start_time,
    capacity_total: data.capacity_total,
    capacity_sold: data.capacity_sold ?? 0,
    cut_off_hours: data.cut_off_hours ?? 2,
    status: data.status ?? "open",
  });

  res.status(201).json(buildOptionView(doc.toObject()));
};

/** GET /tour-options/:id */
export const getOne = async (req: AuthRequest, res: Response) => {
  const doc = await TourOption.findById(req.params.id).lean();
  if (!doc) throw notFound("Tour option not found");
  res.json(buildOptionView(doc));
};

/** PUT /tour-options/:id */
export const update = async (req: AuthRequest, res: Response) => {
  const data = updateBody.parse(req.body);
  const doc = await TourOption.findById(req.params.id);
  if (!doc) throw notFound("Tour option not found");

  if (typeof data.tour_id !== "undefined") {
    const tour = await Tour.findById(data.tour_id);
    if (!tour) throw notFound("Tour not found");
    doc.tour_id = tour._id;
  }
  if (typeof data.start_date !== "undefined") doc.start_date = toDateOnlyUTC(data.start_date);
  if (typeof data.start_time !== "undefined") doc.start_time = data.start_time;
  if (typeof data.capacity_total !== "undefined") doc.capacity_total = data.capacity_total;
  if (typeof data.capacity_sold !== "undefined") doc.capacity_sold = data.capacity_sold;
  if (typeof data.cut_off_hours !== "undefined") doc.cut_off_hours = data.cut_off_hours;
  if (typeof data.status !== "undefined") doc.status = data.status;

  await doc.save();
  const fresh = await TourOption.findById(doc._id).lean();
  res.json(buildOptionView(fresh));
};

/** DELETE /tour-options/:id */
export const remove = async (req: AuthRequest, res: Response) => {
  const del = await TourOption.findByIdAndDelete(req.params.id);
  if (!del) throw notFound("Tour option not found");
  res.json({ ok: true });
};

// ----------------- Admin: tiện ích nhỏ -----------------

/** PUT /tour-options/:id/status  body: { status } */
export const updateStatus = async (req: AuthRequest, res: Response) => {
  const status = z.enum(["open", "full", "closed", "cancelled"]).parse(req.body?.status);
  const doc = await TourOption.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).lean();
  if (!doc) throw notFound("Tour option not found");
  res.json(buildOptionView(doc));
};

/** PUT /tour-options/:id/capacity  body: { capacity_total } */
export const updateCapacity = async (req: AuthRequest, res: Response) => {
  const capacity_total = z.coerce.number().int().min(1).parse(req.body?.capacity_total);
  const doc = await TourOption.findByIdAndUpdate(
    req.params.id,
    { $set: { capacity_total } },
    { new: true }
  ).lean();
  if (!doc) throw notFound("Tour option not found");
  res.json(buildOptionView(doc));
};
