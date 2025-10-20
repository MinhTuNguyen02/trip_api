import mongoose from "mongoose";

/**
 * Kết nối đến MongoDB thông qua Mongoose.
 * Gọi hàm này trong server.ts trước khi lắng nghe port.
 */
export async function connectDB(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}
