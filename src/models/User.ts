import { Schema, model } from "mongoose";
const User = model("User", new Schema({
  name: String,
  email: { type: String, unique: true },
  password_hash: String,
  role: { type: String, default: "user" }
}, { timestamps: true }));
export default User;
