import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import * as CartController from "../controllers/cart.controller";

const r = Router();

r.get("/",        requireAuth, asyncHandler(CartController.getCart));
r.put("/items/:itemId", requireAuth, asyncHandler(CartController.updateCartItem));
r.post("/items",  requireAuth, asyncHandler(CartController.addCartItem));
r.delete("/:itemId", requireAuth, asyncHandler(CartController.removeCartItem));

export default r;
