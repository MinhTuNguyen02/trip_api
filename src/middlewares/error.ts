import { Request, Response, NextFunction } from "express";

/**
 * Middleware xử lý lỗi chung cho toàn bộ API.
 * Dùng app.use(errorHandler) ở cuối app.ts.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Error:", err);

  const status = err.status || 500;
  const message =
    err.message || "Internal Server Error. Please try again later.";

  res.status(status).json({
    success: false,
    error: message,
  });
}
