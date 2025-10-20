import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthRequest } from "../middlewares/auth.middleware";
import * as Cart from "../controllers/cart.controller";

const r = Router();
r.get("/", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Cart.getCart(req.user!.userId))));
r.post("/items", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Cart.addCartItem(req.user!.userId, req.body))));
r.delete("/:itemId", requireAuth, asyncHandler(async (req: AuthRequest, res) => res.json(await Cart.removeCartItem(req.user!.userId, req.params.itemId))));
export default r;
