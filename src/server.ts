import "dotenv/config";
import app from "./app";
import { connectDB } from "./db/connect";
import { env } from "./configs/env";

const port = env.APP_PORT;
const mongoUri = env.MONGODB_URI;
const dbName = env.DATABASE_NAME;

async function startServer() {
  try {
    await connectDB(`${mongoUri}${dbName ? "/" + dbName : ""}`);

    app.listen(port, () => {
      console.log(`Connected to MongoDB: ${dbName}`);
      console.log(`API server running at: ${env.APP_HOST}:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
