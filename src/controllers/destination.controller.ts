import Destination from "../models/Destination";
import { z } from "zod";
import { badRequest, notFound } from "../utils/ApiError";

export const listDestinations = async (query: any) => {
  const region = typeof query.region === "string" ? query.region : undefined;
  const q: any = {};
  if (region) q.region = region;
  const items = await Destination.find(q).sort({ name: 1 }).limit(100);
  return items;
};

const createBody = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  region: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

export const createDestination = async (body: unknown) => {
  const data = createBody.parse(body);
  const exists = await Destination.findOne({ code: data.code.toUpperCase() });
  if (exists) throw badRequest("Destination code already exists");
  const doc = await Destination.create(data);
  return doc;
};

export const getDestination = async (id: string) => {
  const doc = await Destination.findById(id);
  if (!doc) throw notFound("Destination not found");
  return doc;
};
