// src/routes/admin.bookings.route.ts  (ADMIN)
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import * as Bookings from "../controllers/booking.controller";

const r = Router();
r.get("/",    requireAuth, requireAdmin, asyncHandler(Bookings.listBookings));
r.get("/:id", requireAuth, requireAdmin, asyncHandler(Bookings.getBooking));
export default r;
