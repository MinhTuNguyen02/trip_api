import Tour from "../models/Tour";
import { z } from "zod";
import { notFound } from "../utils/ApiError";

export const listTours = async (query: any) => {
  const { destination, minPrice, maxPrice } = query;
  const q: any = {};
  if (typeof destination === "string" && destination.trim()) q.destination_id = destination;
  if (typeof minPrice === "string") q.price = { ...(q.price || {}), $gte: Number(minPrice) };
  if (typeof maxPrice === "string") q.price = { ...(q.price || {}), $lte: Number(maxPrice) };
  const items = await Tour.find(q).sort({ createdAt: -1 }).limit(100);
  return items;
};

export const getTour = async (id: string) => {
  const item = await Tour.findById(id);
  if (!item) throw notFound("Tour not found");
  return item;
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
  capacity: z.number().int().positive().optional()
});

export const createTour = async (body: unknown) => {
  const data = createBody.parse(body);
  const created = await Tour.create(data);
  return created;
};
