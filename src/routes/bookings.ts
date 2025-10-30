import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware";
import * as Bookings from "../controllers/booking.controller";

const r = Router();

r.get("/",    requireAuth, asyncHandler(Bookings.listMyBookings));
r.get("/:id", requireAuth, asyncHandler(Bookings.getMyBooking));

export default r;
