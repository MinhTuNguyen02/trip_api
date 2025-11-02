import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User";
import { badRequest, notFound, forbidden } from "../utils/ApiError";
import { env } from "../configs/env";
import { AuthRequest } from "../middlewares/auth.middleware";
import mongoose from "mongoose";

// Simple phone rule (E.164-ish, linh hoạt, 8-15 số, cho phép + ở đầu)
const phoneRegex = /^\+?[0-9]{8,15}$/;

// ----- REGISTER -----
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid phone number")
    .optional(),
  address: z.string().trim().max(500).optional(),
});

/** POST /auth/register */
export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone, address } = registerSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) throw badRequest("Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash: hashed, phone, address });

  res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      is_active: user.is_active,
    },
  });
};

// ----- LOGIN -----
/** POST /auth/login */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw notFound("User not found");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw badRequest("Invalid password");

  if (!user.is_active) {
    throw badRequest("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.");
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    env.JWT_SECRET as string,
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,       
      address: user.address,   
      role: user.role,
      is_active: user.is_active,
    },
  });
};

// ----- PROFILE -----
/** GET /auth/me */
export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId)
    .select("_id name email role phone address is_active");
  res.json({ user });
};

// ----- UPDATE PROFILE (NEW) -----
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid phone number")
    .optional()
    .or(z.literal("").transform(() => undefined)), // cho phép xoá -> undefined
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)), // cho phép xoá -> undefined
});

/** PATCH /auth/me */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const body = updateProfileSchema.parse(req.body);

  const user = await User.findById(req.user!.userId);
  if (!user) throw notFound("User not found");

  if (typeof body.name !== "undefined") user.name = body.name;
  if (typeof body.phone !== "undefined") user.phone = body.phone;
  if (typeof body.address !== "undefined") user.address = body.address;

  await user.save();

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    },
  });
};

// ----- CHANGE PASSWORD (NEW) -----
const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
});

/** POST /auth/change-password */
export const changePassword = async (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user!.userId);
  if (!user) throw notFound("User not found");

  const ok = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) throw badRequest("Mật khẩu hiện tại không đúng");

  const same = await bcrypt.compare(new_password, user.password_hash);
  if (same) throw badRequest("Mật khẩu mới phải khác mật khẩu hiện tại");

  user.password_hash = await bcrypt.hash(new_password, 10);
  await user.save();

  // (tùy chọn) Có thể vô hiệu hoá các refresh token/tokens cũ ở đây nếu bạn quản lý.
  res.json({ ok: true, message: "Đổi mật khẩu thành công" });
};

// (nếu bạn muốn lọc tìm kiếm/paginate sau này có thể mở rộng)
const baseProjection = "_id name email role phone address is_active createdAt";

export const listUsers = async (req: Request, res: Response) => {
  const q = String((req.query.q ?? "") as string).trim();
  const match: any = { role: "user" };
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ name: re }, { email: re }, { phone: re }, { address: re }];
  }
  const users = await User.find(match).select(baseProjection).sort({ createdAt: -1 }).lean();
  res.json(users);
};

export const listAdmins = async (req: Request, res: Response) => {
  const q = String((req.query.q ?? "") as string).trim();
  const match: any = { role: "admin" };
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ name: re }, { email: re }, { phone: re }, { address: re }];
  }
  const admins = await User.find(match).select(baseProjection).sort({ createdAt: -1 }).lean();
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
    _id: user._id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, address: user.address, is_active: user.is_active, createdAt: user.createdAt,
  });
};

/** ---- BẬT/TẮT HOẠT ĐỘNG ---- */
const setActiveSchema = z.object({ is_active: z.boolean() });
export const setUserActive = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user id");
  const { is_active } = setActiveSchema.parse(req.body);

  const user = await User.findById(id);
  if (!user) throw notFound("User not found");

  // Không cho tự vô hiệu hóa chính mình
  if (String(user._id) === String(req.user!.userId) && !is_active) {
    throw forbidden("Bạn không thể tự vô hiệu hóa tài khoản của mình.");
  }

  // Không cho vô hiệu hóa admin cuối cùng
  if (user.role === "admin" && !is_active) {
    const admins = await User.countDocuments({ role: "admin", is_active: true, _id: { $ne: user._id } });
    if (admins === 0) throw forbidden("Không thể vô hiệu hóa admin cuối cùng.");
  }

  user.is_active = is_active;
  await user.save();
  res.json({
    _id: user._id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, address: user.address, is_active: user.is_active, createdAt: user.createdAt,
  });
};

/** ---- XÓA USER ---- */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user id");
  const user = await User.findById(id);
  if (!user) throw notFound("User not found");

  // không xóa chính mình
  if (String(user._id) === String(req.user!.userId)) {
    throw forbidden("Bạn không thể tự xóa tài khoản của mình.");
  }
  // không xóa admin cuối cùng
  if (user.role === "admin") {
    const otherAdmins = await User.countDocuments({ role: "admin", _id: { $ne: user._id } });
    if (otherAdmins === 0) throw forbidden("Không thể xóa admin cuối cùng.");
  }

  await User.deleteOne({ _id: user._id });
  res.json({ ok: true });
};