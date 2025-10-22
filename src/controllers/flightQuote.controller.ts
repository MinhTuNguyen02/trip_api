import { Request, Response } from "express";
import FlightQuote from "../models/FlightQuote.ts";
import { z } from "zod";
import { notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

const createSchema = z.object({
  itinerary_id: z.string().min(8),
  origin: z.string().min(2),
  dest: z.string().min(2),
  depart_at: z.string(), // ISO date string
  return_at: z.string(),
  price: z.number().nonnegative(),
  deeplink: z.string().url().optional()
});

export const listByItinerary = async (req: Request, res: Response) => {
  const { itinerary } = req.query;
  const q: any = {};
  if (typeof itinerary === "string") q.itinerary_id = itinerary;
  const list = await FlightQuote.find(q).sort({ createdAt: -1 });
  res.json(list);
};

export const createQuote = async (req: AuthRequest, res: Response) => {
  const data = createSchema.parse(req.body);
  const created = await FlightQuote.create(data);
  res.status(201).json(created);
};

export const deleteQuote = async (req: Request, res: Response) => {
  const removed = await FlightQuote.findByIdAndDelete(req.params.id);
  if (!removed) throw notFound("Flight quote not found");
  res.json({ ok: true });
};
