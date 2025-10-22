import { Request, Response } from "express";
import Itinerary from "../models/Itinerary";
import { z } from "zod";
import { notFound } from "../utils/ApiError";
import { AuthRequest } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  destination_id: z.string().min(8),
  start_date: z.string(),
  end_date: z.string(),
  budget: z.number().nonnegative().optional(),
  prefs: z.array(z.string()).optional(),
  plan_json: z.any(),
  price_est: z.number().nonnegative().optional()
});

export const listMine = async (req: AuthRequest, res: Response) => {
  const list = await Itinerary.find({ user_id: req.user!.userId }).sort({ createdAt: -1 });
  res.json(list);
};

export const createItinerary = async (req: AuthRequest, res: Response) => {
  const data = bodySchema.parse(req.body);
  const created = await Itinerary.create({ ...data, user_id: req.user!.userId });
  res.status(201).json(created);
};

export const getMine = async (req: AuthRequest, res: Response) => {
  const it = await Itinerary.findOne({ _id: req.params.id, user_id: req.user!.userId });
  if (!it) throw notFound("Itinerary not found");
  res.json(it);
};

export const deleteMine = async (req: AuthRequest, res: Response) => {
  const removed = await Itinerary.findOneAndDelete({ _id: req.params.id, user_id: req.user!.userId });
  if (!removed) throw notFound("Itinerary not found");
  res.json({ ok: true });
};
