import { Router } from "express";
const r = Router();

/** Ping nhanh để kiểm tra hệ thống */
r.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "trip-api",
    time: new Date().toISOString(),
  });
});

export default r;
