import "dotenv/config";
import app from "./app";
import { connectDB } from "./db/connect";
import { env } from "./configs/env";

async function startServer() {
  try {
    await connectDB(env.MONGODB_URI, env.DATABASE_NAME); 
    app.listen(env.APP_PORT, () => {
      console.log(`API server running at: ${env.APP_HOST}:${env.APP_PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
startServer();