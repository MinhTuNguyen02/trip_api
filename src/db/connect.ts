import mongoose from "mongoose";

export async function connectDB(uri: string, dbName?: string) {
  try {
    await mongoose.connect(uri, { dbName });
    console.log("MongoDB connected:", mongoose.connection.name); 
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}
