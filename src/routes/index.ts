import { Router } from "express";
import healthRouter from "./health";
import destinationRouter from "./destinations";
import tourRouter from "./tours";
import aiRouter from "./ai";
import authRouter from "./auth";
import cartRouter from "./cart";
import checkoutRouter from "./checkout";
import bookingRouter from "./bookings";
import poiRouter from "./pois";
import itineraryRouter from "./itineraries";
import paymentRouter from "./payments";
import flightQuoteRouter from "./flight-quotes";

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

router.use("/pois", poiRouter);
router.use("/itineraries", itineraryRouter);
router.use("/payments", paymentRouter);
router.use("/flight-quotes", flightQuoteRouter);


export default router;
