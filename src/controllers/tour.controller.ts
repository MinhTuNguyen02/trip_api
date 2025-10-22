import { Request, Response } from "express";
import Tour from "../models/Tour";
import { z } from "zod";
import { notFound } from "../utils/ApiError"; 

/** GET /tours */
export const listTours = async (req: Request, res: Response) => {
  const { destination, minPrice, maxPrice } = req.query as {
    destination?: string; minPrice?: string; maxPrice?: string;
  };

  const q: any = {};
  if (destination && destination.trim()) q.destination_id = destination;
  if (minPrice) q.price = { ...(q.price || {}), $gte: Number(minPrice) };
  if (maxPrice) q.price = { ...(q.price || {}), $lte: Number(maxPrice) };

  const items = await Tour.find(q).sort({ createdAt: -1 }).limit(100);
  res.json(items);
};

/** GET /tours/:id */
export const getTour = async (req: Request, res: Response) => {
  const item = await Tour.findById(req.params.id);
  if (!item) throw notFound("Tour not found");
  res.json(item);
};

const createBody = z.object({
  destination_id: z.string().min(8),
  title: z.string().min(2),
  summary: z.string().min(2),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  duration_hr: z.number().positive(),
  start_times: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  policy: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

/** POST /tours */
export const createTour = async (req: Request, res: Response) => {
  const data = createBody.parse(req.body);
  const created = await Tour.create(data);
  res.status(201).json(created);
};

const updateSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  price: z.number().optional(),
  duration_hr: z.number().optional(),
  start_times: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  policy: z.string().optional(),
  is_active: z.boolean().optional(),
});

/** PUT /tours/:id */
export const updateTour = async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const updated = await Tour.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!updated) throw notFound("Tour not found");
  res.json(updated);
};
