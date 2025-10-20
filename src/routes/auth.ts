import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as Auth from "../controllers/auth.controller";

const r = Router();
r.post("/register", asyncHandler(async (req, res) => res.status(201).json({ user: await Auth.register(req.body) })));
r.post("/login", asyncHandler(async (req, res) => res.json(await Auth.login(req.body))));
export default r;
