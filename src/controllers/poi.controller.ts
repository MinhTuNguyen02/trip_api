import { Request, Response } from "express";
import POI from "../models/POI";
import { z } from "zod";
import { notFound } from "../utils/ApiError";
import { coerceBoolean } from "../utils/coerce";
import mongoose from "mongoose";

const imageStr = z.string().refine(
  (s) => /^https?:\/\//i.test(s) || s.startsWith("/"),
  "Ảnh phải là URL hợp lệ (http/https) hoặc đường dẫn bắt đầu bằng /"
);
/** --------- Schemas --------- */
const createSchema = z.object({
  destination_id: z.string().min(8),
  name: z.string().min(2),
  type: z.enum(["sightseeing","food","nature","nightlife","other"]).default("other"),
  duration_min: z.coerce.number().int().positive().default(90),
  open_from: z.string().default("08:00"),
  open_to: z.string().default("21:00"),
  price_est: z.coerce.number().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  images: z.array(imageStr).default([]),                // ⭐ nới lỏng ảnh
  geo: z.object({ lat: z.coerce.number().optional(), lng: z.coerce.number().optional() }).optional(), // ⭐ thêm geo
  is_active: z.coerce.boolean().optional(),
});

const updateSchema = z.object({
  destination_id: z.string().min(8).optional(),
  name: z.string().min(2).optional(),
  type: z.enum(["sightseeing","food","nature","nightlife","other"]).optional(),
  duration_min: z.coerce.number().int().positive().optional(),
  open_from: z.string().optional(),
  open_to: z.string().optional(),
  price_est: z.coerce.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(imageStr).optional(),                 // ⭐ nới lỏng ảnh
  geo: z.object({ lat: z.coerce.number().optional(), lng: z.coerce.number().optional() }).optional(), // ⭐ thêm geo
  is_active: z.coerce.boolean().optional(),
}) /* .strict() bỏ đi để không chặn field dư */;

/** --------- Handlers --------- */

export const listPOIs = async (req: Request, res: Response) => {
  const { destination, type } = req.query;
  const page = Math.max(1, parseInt((req.query.page ?? "1") as string));
  const limit = Math.max(1, parseInt((req.query.limit ?? "12") as string));
  const skip = (page - 1) * limit;

  const q: any = {};

  if (typeof destination === "string" && mongoose.isValidObjectId(destination)) {
    q.destination_id = new mongoose.Types.ObjectId(destination);
  }

  if (typeof type === "string" && type) q.type = type;

  const [items, total] = await Promise.all([
    POI.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    POI.countDocuments(q)
  ]);

  res.json({
    data: items, total, page, limit, totalPages: Math.ceil(total / limit)
  });
};

export const getPOI = async (req: Request, res: Response) => {
  const poi = await POI.findById(req.params.id).lean();
  if (!poi) throw notFound("POI not found");
  res.json(poi);
};

export const createPOI = async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const created = await POI.create({
    destination_id: data.destination_id,
    name: data.name,
    type: data.type ?? "other",
    duration_min: data.duration_min ?? 90,
    open_from: data.open_from ?? "08:00",
    open_to: data.open_to ?? "21:00",
    price_est: data.price_est ?? 0,
    geo: data.geo,
    tags: data.tags ?? [],
    images: data.images ?? [],
    ...(typeof data.is_active !== "undefined" ? { is_active: data.is_active } : {}), // ✅
  });
  res.status(201).json(created);
};

export const updatePOI = async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);

  // Load → modify → save (đảm bảo boolean false không bị rơi)
  const doc = await POI.findById(req.params.id);
  if (!doc) throw notFound("POI not found");

  if (typeof data.destination_id !== "undefined") doc.destination_id = data.destination_id as any;
  if (typeof data.name !== "undefined") doc.name = data.name!;
  if (typeof data.type !== "undefined") doc.type = data.type!;
  if (typeof data.duration_min !== "undefined") doc.duration_min = data.duration_min!;
  if (typeof data.open_from !== "undefined") doc.open_from = data.open_from!;
  if (typeof data.open_to !== "undefined") doc.open_to = data.open_to!;
  if (typeof data.price_est !== "undefined") doc.price_est = data.price_est!;
  if (typeof data.tags !== "undefined") doc.tags = data.tags!;
  if (typeof data.geo !== "undefined") doc.geo = data.geo as any; 
  if (typeof data.images !== "undefined") doc.images = data.images!;
  if (typeof data.is_active !== "undefined") doc.is_active = data.is_active!; // ✅

  await doc.save();
  const fresh = await POI.findById(doc._id).lean();
  res.json(fresh);
};

export const deletePOI = async (req: Request, res: Response) => {
  const removed = await POI.findByIdAndDelete(req.params.id);
  if (!removed) throw notFound("POI not found");
  res.json({ ok: true });
};

export const toggleActive = async (req: Request, res: Response) => {
  // Cho phép gửi "false"/false/0 → false
  const is_active = coerceBoolean(req.body?.is_active);

  // Cập nhật nhanh bằng $set (giống destination active-hard)
  const result = await POI.updateOne(
    { _id: req.params.id },
    { $set: { is_active } }
  );

  if (result.matchedCount === 0) throw notFound("POI not found");

  const fresh = await POI.findById(req.params.id).lean();
  res.json(fresh);
};
