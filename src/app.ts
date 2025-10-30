import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middlewares/error";
import { env } from "./configs/env";
// import payosWebhook from "./routes/webhooks/payos";
import { handlePayOSWebhook } from "./controllers/checkout.controller";
import uploadRouter from "./routes/upload";

const app = express();

app.post(
    "/api/webhooks/payos",
    express.raw({ type: "application/json" }),
    (req, res) => handlePayOSWebhook(req as any, res)
  );

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);
app.use("/api/upload", uploadRouter);
app.use(errorHandler);

export default app;
