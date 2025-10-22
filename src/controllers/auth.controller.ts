import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User";
import { badRequest, notFound } from "../utils/ApiError";
import { env } from "../configs/env";
import { AuthRequest } from "../middlewares/auth.middleware";

// ----- REGISTER -----
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

/** POST /auth/register */
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const existing = await User.findOne({ email });
  if (existing) throw badRequest("Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash: hashed });

  res.status(201).json({ user: { id: user._id, email: user.email } });
};

// ----- LOGIN -----
/** POST /auth/login */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw notFound("User not found");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw badRequest("Invalid password");

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

// ----- PROFILE -----
/** GET /auth/me */
export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).select("_id name email role");
  res.json({ user });
};
