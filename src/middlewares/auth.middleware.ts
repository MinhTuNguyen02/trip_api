import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
