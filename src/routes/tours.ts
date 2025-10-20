import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as Tours from "../controllers/tour.controller";

const r = Router();

r.get("/", asyncHandler(async (req, res) => res.json(await Tours.listTours(req.query))));
r.get("/:id", asyncHandler(async (req, res) => res.json(await Tours.getTour(req.params.id))));
r.post("/", asyncHandler(async (req, res) => {
  const created = await Tours.createTour(req.body);
  res.status(201).json(created);
}));

export default r;
