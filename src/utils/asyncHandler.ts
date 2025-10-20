import { Request, Response, NextFunction } from "express";

/** Bọc hàm async để tự động chuyển lỗi vào error handler */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
