// src/routes/tickets.routes.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import * as Tickets from "../controllers/ticket.controller";

const r = Router();

r.get("/", requireAuth, asyncHandler(Tickets.listMyTickets));
r.get("/code/:code", requireAuth, asyncHandler(Tickets.getMyTicketByCode));
r.get("/:id", requireAuth, asyncHandler(Tickets.getMyTicket));

export default r;
