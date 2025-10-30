import { Request, Response } from "express";
import Destination from "../models/Destination";
import Tour from "../models/Tour";
import POI from "../models/POI";
import { z } from "zod";
import { badRequest, notFound } from "../utils/ApiError";
import { coerceBoolean } from "../utils/coerce";

/** GET /destinations */
export const listDestinations = async (req: Request, res: Response) => {
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const q: any = {};
  if (region) q.region = region;

  const items = await Destination.find(q)
    .collation({ locale: "vi", strength: 1 }) 
    .sort({ name: 1 })
    .limit(100)
    .lean();

  res.json(items);
};

/** GET /destinations/:id */
export const getDestination = async (req: Request, res: Response) => {
  const doc = await Destination.findById(req.params.id).lean();
  if (!doc) throw notFound("Destination not found");
  res.json(doc);
};

/** ----- Schemas ----- */
const createBody = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  region: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  is_active: z.coerce.boolean().optional(),
});

const updateBody = z.object({
  code: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  region: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  is_active: z.coerce.boolean().optional(),
}).strict();

/** POST /destinations */
export const createDestination = async (req: Request, res: Response) => {
  const data = createBody.parse(req.body);
  const code = data.code.toUpperCase();

  const exists = await Destination.findOne({ code });
  if (exists) throw badRequest("Destination code already exists");

  const doc = await Destination.create({
    code,
    name: data.name,
    region: data.region,
    description: data.description,
    images: data.images ?? [],
    ...(typeof data.is_active !== "undefined" ? { is_active: data.is_active } : {})
  });

  res.status(201).json(doc);
};

/** PUT /destinations/:id */
export const updateDestination = async (req: Request, res: Response) => {
  const data = updateBody.parse(req.body);

  const doc = await Destination.findById(req.params.id);
  if (!doc) throw notFound("Destination not found");

  if (typeof data.code !== "undefined") {
    const newCode = data.code.toUpperCase();
    if (newCode !== doc.code) {
      const dup = await Destination.findOne({ code: newCode, _id: { $ne: doc._id } });
      if (dup) throw badRequest("Destination code already exists");
      doc.code = newCode;
    }
  }
  if (typeof data.name !== "undefined") doc.name = data.name;
  if (typeof data.region !== "undefined") doc.region = data.region || undefined;
  if (typeof data.description !== "undefined") doc.description = data.description || undefined;
  if (typeof data.images !== "undefined") doc.images = data.images;
  if (typeof data.is_active !== "undefined") doc.is_active = data.is_active;

  await doc.save();
  res.json(await Destination.findById(doc._id).lean());
};

/** DELETE /destinations/:id */
export const deleteDestination = async (req: Request, res: Response) => {
  const id = req.params.id;

  const [tourCount, poiCount] = await Promise.all([
    Tour.countDocuments({ destination_id: id }),
    POI.countDocuments({ destination_id: id }),
  ]);

  if (tourCount > 0 || poiCount > 0) {
    throw badRequest(`Không thể xóa: còn ${tourCount} tour và ${poiCount} POI đang dùng destination này`);
  }

  const deleted = await Destination.findByIdAndDelete(id);
  if (!deleted) throw notFound("Destination not found");

  res.json({ ok: true });
};

/** PUT /destinations/:id/active-hard */
export const setActiveHard = async (req: Request, res: Response) => {
  const is_active = coerceBoolean(req.body?.is_active);

  const result = await Destination.updateOne(
    { _id: req.params.id },
    { $set: { is_active } }
  );
  if (result.matchedCount === 0) throw notFound("Destination not found");

  const fresh = await Destination.findById(req.params.id).lean();
  res.json(fresh);
};
