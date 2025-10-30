import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middlewares/error";
import { env } from "./configs/env";
import uploadRouter from "./routes/upload";
import payosWebhookRouter  from "./routes/webhooks/payos"

const app = express();

app.use("/api/webhooks/payos", express.json({ type: "*/*" }), payosWebhookRouter);

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);
app.use("/api/upload", uploadRouter);
app.use(errorHandler);

export default app;
