import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthRequest } from "../middlewares/auth.middleware";
import * as Bookings from "../controllers/booking.controller";

const r = Router();
r.get("/", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Bookings.listMyBookings(req.user!.userId))));
r.get("/:id", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Bookings.getMyBooking(req.user!.userId, req.params.id))));
export default r;
