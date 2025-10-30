// src/controllers/adminUsers.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/User";
import { badRequest } from "../utils/ApiError";

// (nếu bạn muốn lọc tìm kiếm/paginate sau này có thể mở rộng)
const baseProjection = "_id name email role phone address createdAt";

export const listUsers = async (_req: Request, res: Response) => {
  const users = await User.find({ role: "user" }).select(baseProjection).sort({ createdAt: 1 }).lean();
  res.json(users);
};

export const listAdmins = async (_req: Request, res: Response) => {
  const admins = await User.find({ role: "admin" })
    .select(baseProjection)
    .sort({ createdAt: 1 })
    .lean();
  res.json(admins);
};

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Tên quá ngắn"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

/** POST /admin/admins  (body: {name,email,password}) */
export const createAdmin = async (req: Request, res: Response) => {
  const { name, email, password } = createAdminSchema.parse(req.body);

  const existed = await User.findOne({ email });
  if (existed) throw badRequest("Email đã tồn tại");

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password_hash,
    role: "admin",
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt,
  });
};
