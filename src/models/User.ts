// src/models/User.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password_hash: string;            // required
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ["user","admin"], default: "user" }
}, { timestamps: true });

export default model<IUser>("User", userSchema);
