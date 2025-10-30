import { Request, Response } from "express";
import { z } from "zod";
import Tour from "../models/Tour";
import Destination from "../models/Destination";
import { badRequest, notFound } from "../utils/ApiError";

/** schema validate đầu vào */
const planSchema = z.object({
  destinationId: z.string().min(8),
  startDate: z.string(), // ISO date string
  days: z.number().int().min(2).max(5),
  budget: z.number().int().positive().optional(),
  prefs: z.array(z.enum(["biển", "ẩm thực", "thiên nhiên", "đêm"])).optional(),
});

/** POST /ai/itinerary */
export const buildItinerary = async (req: Request, res: Response) => {
  const input = planSchema.parse(req.body);

  const [dest, tours] = await Promise.all([
    Destination.findById(input.destinationId),
    Tour.find({ destination_id: input.destinationId }).sort({ price: 1 }).limit(50),
  ]);

  if (!dest) throw notFound("Destination not found");
  if (!tours.length) throw badRequest("No tours available for this destination");

  // --- Build simple AI itinerary logic ---
  const perDay = Math.min(2, Math.max(1, Math.floor(tours.length / input.days) || 1));
  const plan: any[] = [];
  let idx = 0, totalCost = 0;

  for (let d = 1; d <= input.days; d++) {
    const dayItems: any[] = [];
    for (let k = 0; k < perDay && idx < tours.length; k++, idx++) {
      const t = tours[idx];
      dayItems.push({
        type: "tour",
        id: t._id,
        title: t.title,
        duration_hr: t.duration_hr,
        price: t.price,
      });
      totalCost += Number(t.price || 0);
    }

    plan.push({
      day: d,
      slots: [
        { slot: "Sáng", items: dayItems.slice(0, 1) },
        { slot: "Chiều", items: dayItems.slice(1, 2) },
        { slot: "Tối", items: [] },
      ],
      note: "Có thể bổ sung lịch ẩm thực/đêm theo sở thích.",
    });
  }

  // --- Kết quả cuối cùng ---
  const result = {
    destinationId: input.destinationId,
    startDate: input.startDate,
    days: input.days,
    plan,
    summary: {
      destination: { id: dest._id, name: dest.name, region: dest.region },
      days: input.days,
      est_cost: totalCost,
      budget_ok: input.budget ? totalCost <= input.budget : undefined,
    },
  };

  res.json(result);
};
