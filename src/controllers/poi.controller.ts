import { Request, Response } from "express";
import POI from "../models/POI";
import { z } from "zod";
import { notFound } from "../utils/ApiError";

const createSchema = z.object({
  destination_id: z.string().min(8),
  name: z.string().min(2),
  type: z.enum(["sightseeing","food","nature","nightlife","other"]).default("other"),
  duration_min: z.number().int().positive().default(90),
  open_from: z.string().default("08:00"),
  open_to: z.string().default("21:00"),
  price_est: z.number().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([])
});

export const listPOIs = async (req: Request, res: Response) => {
  const { destination, type } = req.query;
  const q: any = {};
  if (typeof destination === "string") q.destination_id = destination;
  if (typeof type === "string") q.type = type;
  const items = await POI.find(q).sort({ createdAt: -1 }).limit(200);
  res.json(items);
};

export const getPOI = async (req: Request, res: Response) => {
  const poi = await POI.findById(req.params.id);
  if (!poi) throw notFound("POI not found");
  res.json(poi);
};

export const createPOI = async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const created = await POI.create(data);
  res.status(201).json(created);
};

export const updatePOI = async (req: Request, res: Response) => {
  const updated = await POI.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFound("POI not found");
  res.json(updated);
};

export const deletePOI = async (req: Request, res: Response) => {
  const removed = await POI.findByIdAndDelete(req.params.id);
  if (!removed) throw notFound("POI not found");
  res.json({ ok: true });
};
