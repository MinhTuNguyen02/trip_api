import { Schema, model, Types } from "mongoose";
const Booking = model("Booking", new Schema({
  user_id: { type: Types.ObjectId, ref: "User", required: true },
  total: Number,
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  payment_id: String,
  items: [{
    type: { type: String },
    ref_id: { type: Types.ObjectId, refPath: "items.type" },
    qty: Number,
    unit_price: Number
  }]
}, { timestamps: true }));
export default Booking;
