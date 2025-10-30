import { Request, Response } from "express";
import Payment from "../models/Payment";
import { AuthRequest } from "../middlewares/auth.middleware";

/** GET /payments — danh sách của user hiện tại */
export const listMyPayments = async (req: AuthRequest, res: Response) => {
  const list = await Payment.find({ user_id: req.user!.userId }).sort({ createdAt: -1 });
  res.json(list);
};

/** GET /payments/:id — chi tiết một payment của user hiện tại */
export const getMyPayment = async (req: AuthRequest, res: Response) => {
  const p = await Payment.findOne({ _id: req.params.id, user_id: req.user!.userId });
  if (!p) return res.status(404).json({ error: "Payment not found" });
  res.json(p);
};

