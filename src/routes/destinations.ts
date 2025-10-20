import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as Destinations from "../controllers/destination.controller";

const r = Router();

r.get("/", asyncHandler(async (req, res) => {
  res.json(await Destinations.listDestinations(req.query));
}));

r.post("/", asyncHandler(async (req, res) => {
  const created = await Destinations.createDestination(req.body);
  res.status(201).json(created);
}));

export default r;
