import { Request, Response } from "express";
import Destination from "../models/Destination";
import { z } from "zod";
import { badRequest, notFound } from "../utils/ApiError";

/** GET /destinations */
export const listDestinations = async (req: Request, res: Response) => {
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const q: any = {};
  if (region) q.region = region;

  const items = await Destination.find(q).sort({ name: 1 }).limit(100);
  res.json(items);
};

/** schema tạo mới */
const createBody = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  region: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

/** POST /destinations */
export const createDestination = async (req: Request, res: Response) => {
  const data = createBody.parse(req.body);

  // chuẩn hoá code thành UPPERCASE để tránh trùng/khác chữ hoa-thường
  const code = data.code.toUpperCase();
  const exists = await Destination.findOne({ code });
  if (exists) throw badRequest("Destination code already exists");

  const doc = await Destination.create({ ...data, code });
  res.status(201).json(doc);
};

/** GET /destinations/:id */
export const getDestination = async (req: Request, res: Response) => {
  const doc = await Destination.findById(req.params.id);
  if (!doc) throw notFound("Destination not found");
  res.json(doc);
};
