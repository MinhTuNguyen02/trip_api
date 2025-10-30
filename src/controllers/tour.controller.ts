import { Request, Response } from "express";
import Tour from "../models/Tour";
import POI from "../models/POI"; // (optional) dùng để validate poi thuộc cùng destination
import { z } from "zod";
import { notFound, badRequest } from "../utils/ApiError";
import { coerceBoolean } from "../utils/coerce";

// ---- helper: string ảnh hợp lệ (http/https hoặc bắt đầu bằng /)
const imageStr = z.string().refine(
  (s) => /^https?:\/\//i.test(s) || s.startsWith("/"),
  "Ảnh phải là URL hợp lệ (http/https) hoặc đường dẫn bắt đầu bằng /"
);

// ---- helper: ObjectId string đơn giản
const objectIdStr = z.string().min(8, "ObjectId không hợp lệ");

// ---------- LIST ----------
/** GET /tours */
export const listTours = async (req: Request, res: Response) => {
  const { destination, departure, minPrice, maxPrice } = req.query as {
    destination?: string;
    departure?: string;
    minPrice?: string;
    maxPrice?: string;
  };

  const q: any = {};
  if (destination && destination.trim()) q.destination_id = destination;
  if (departure && departure.trim()) q.departure_id = departure;
  if (minPrice) q.price = { ...(q.price || {}), $gte: Number(minPrice) };
  if (maxPrice) q.price = { ...(q.price || {}), $lte: Number(maxPrice) };

  const items = await Tour.find(q).sort({ createdAt: -1 }).limit(100).lean();
  res.json(items);
};

// ---------- DETAIL ----------
/** GET /tours/:id */
export const getTour = async (req: Request, res: Response) => {
  const item = await Tour.findById(req.params.id)
    .populate("poi_ids", "name type images") // NEW: tiện cho UI
    .lean();
  if (!item) throw notFound("Tour not found");
  res.json(item);
};

// ---------- Schemas ----------
const createBody = z.object({
  destination_id: objectIdStr,
  departure_id: objectIdStr,
  title: z.string().min(2),
  summary: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  duration_hr: z.coerce.number().positive(),
  images: z.array(imageStr).default([]),
  policy: z.string().optional(),
  is_active: z.coerce.boolean().optional(),

  // NEW: danh sách poi_ids chọn trong tour
  poi_ids: z.array(objectIdStr).optional(),
});

const updateSchema = z
  .object({
    destination_id: objectIdStr.optional(),
    departure_id: objectIdStr.optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    price: z.coerce.number().optional(),
    duration_hr: z.coerce.number().optional(),
    images: z.array(imageStr).optional(),
    policy: z.string().optional(),
    is_active: z.coerce.boolean().optional(),

    // NEW
    poi_ids: z.array(objectIdStr).optional(),
  })
  .strict();

/** (optional) Đảm bảo mọi POI đều thuộc cùng destination */
async function validatePOIsSameDestination(poiIds: string[], destinationId: string) {
  if (!poiIds?.length) return;
  const pois = await POI.find({ _id: { $in: poiIds } }, { destination_id: 1 }).lean();
  if (pois.length !== poiIds.length) throw badRequest("Một số POI không tồn tại");

  const allSame = pois.every((p) => String(p.destination_id) === String(destinationId));
  if (!allSame) throw badRequest("Tất cả POI phải thuộc cùng Destination với Tour");
}

// ---------- CREATE ----------
/** POST /tours */
export const createTour = async (req: Request, res: Response) => {
  const data = createBody.parse(req.body);

  // (optional) validate cùng destination
  if (data.poi_ids?.length) {
    await validatePOIsSameDestination(data.poi_ids, data.destination_id);
  }

  const created = await Tour.create({
    destination_id: data.destination_id,
    departure_id: data.departure_id,
    title: data.title,
    summary: data.summary,
    description: data.description,
    price: data.price,
    duration_hr: data.duration_hr,
    images: data.images ?? [],
    policy: data.policy,
    ...(typeof data.is_active !== "undefined" ? { is_active: data.is_active } : {}),
    poi_ids: data.poi_ids ?? [], // NEW
  });

  res.status(201).json(created);
};

// ---------- UPDATE ----------
/** PUT /tours/:id */
export const updateTour = async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);

  const doc = await Tour.findById(req.params.id);
  if (!doc) throw notFound("Tour not found");

  // (optional) validate cùng destination (destination_id có thể update)
  const newDestinationId = data.destination_id ? data.destination_id : String(doc.destination_id);
  if (data.poi_ids) {
    await validatePOIsSameDestination(data.poi_ids, newDestinationId);
  }

  if (typeof data.destination_id !== "undefined") doc.destination_id = data.destination_id as any;
  if (typeof data.departure_id !== "undefined") doc.departure_id = data.departure_id as any;
  if (typeof data.title !== "undefined") doc.title = data.title;
  if (typeof data.summary !== "undefined") doc.summary = data.summary;
  if (typeof data.description !== "undefined") doc.description = data.description;
  if (typeof data.price !== "undefined") doc.price = data.price;
  if (typeof data.duration_hr !== "undefined") doc.duration_hr = data.duration_hr;
  if (typeof data.images !== "undefined") doc.images = data.images;
  if (typeof data.policy !== "undefined") doc.policy = data.policy;
  if (typeof data.is_active !== "undefined") doc.is_active = data.is_active;
  if (typeof (data as any).poi_ids !== "undefined") doc.poi_ids = data.poi_ids as any; // NEW

  await doc.save();
  const fresh = await Tour.findById(doc._id).populate("poi_ids", "name type images").lean();
  res.json(fresh);
};

// ---------- DELETE ----------
/** DELETE /tours/:id */
export const deleteTour = async (req: Request, res: Response) => {
  const deleted = await Tour.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFound("Tour not found");
  res.json({ ok: true });
};

// ---------- TOGGLE ----------
/** PUT /tours/:id/active */
export const toggleActive = async (req: Request, res: Response) => {
  const is_active = coerceBoolean(req.body?.is_active);

  const result = await Tour.updateOne({ _id: req.params.id }, { $set: { is_active } });
  if (result.matchedCount === 0) throw notFound("Tour not found");

  const fresh = await Tour.findById(req.params.id).lean();
  res.json(fresh);
};
