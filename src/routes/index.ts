import { Router } from "express";
import healthRouter from "./health";
import destinationRouter from "./destinations";
import tourRouter from "./tours";
import authRouter from "./auth";
import cartRouter from "./cart";
import checkoutRouter from "./checkout";
import bookingRouter from "./bookings";
import poiRouter from "./pois";
import ticketRouter from "./ticket"
import paymentRouter from "./payments";
import tourOptionRoutes from "./tourOption"
import adminRoutes from "./adminBookings";
import adminDashboardRouter from "./adminDashboard"
const router = Router();

/** Nhóm public routes trước */
router.use("/health", healthRouter);
router.use("/destinations", destinationRouter);
router.use("/tours", tourRouter);
router.use("/tour-options", tourOptionRoutes);
router.use("/tickets", ticketRouter);

router.use("/auth", authRouter);
router.use("/admin", adminRoutes);
router.use("/dashboard", adminDashboardRouter);
router.use("/cart", cartRouter);
router.use("/checkout", checkoutRouter);
router.use("/bookings", bookingRouter);

router.use("/pois", poiRouter);
router.use("/payments", paymentRouter);


export default router;
