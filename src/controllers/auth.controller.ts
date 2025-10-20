import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User";
import { badRequest, notFound } from "../utils/ApiError";
import { env } from "../configs/env";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

export const register = async (body: unknown) => {
  const { name, email, password } = registerSchema.parse(body);
  const existing = await User.findOne({ email });
  if (existing) throw badRequest("Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash: hashed });
  return { id: user._id, email: user.email };
};

export const login = async (body: any) => {
  const { email, password } = body;
  const user = await User.findOne({ email });
  if (!user) throw notFound("User not found");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw badRequest("Invalid password");

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email }
  };
};
