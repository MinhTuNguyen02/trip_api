import { Router } from "express";
import tourRouter from "./tours";
import destRouter from "./destinations";
const r = Router();
r.use("/tours", tourRouter);
r.use("/destinations", destRouter);
export default r;