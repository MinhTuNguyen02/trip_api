import { Router } from "express";
import healthRouter from "./health";
import destinationRouter from "./destinations";
import tourRouter from "./tours";
import aiRouter from "./ai";
import authRouter from "./auth";
import cartRouter from "./cart";
import checkoutRouter from "./checkout";
import bookingRouter from "./bookings";

const router = Router();

/** Nhóm public routes trước */
router.use("/health", healthRouter);
router.use("/destinations", destinationRouter);
router.use("/tours", tourRouter);

/** AI itinerary (gợi ý lịch trình 2–5 ngày) */
router.use("/ai", aiRouter);

router.use("/auth", authRouter);
router.use("/cart", cartRouter);
router.use("/checkout", checkoutRouter);
router.use("/bookings", bookingRouter);


export default router;
