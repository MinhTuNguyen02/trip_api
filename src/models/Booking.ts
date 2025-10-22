// src/models/Booking.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IBookingItem {
  _id: Types.ObjectId;
  type: "tour";
  ref_id: Types.ObjectId;
  qty: number;
  unit_price: number;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  total: number;
  status: "pending" | "paid" | "cancelled";
  payment_id?: string;
  items: IBookingItem[];
  createdAt: Date;
  updatedAt: Date;
}

const bookingItemSchema = new Schema<IBookingItem>({
  type: { type: String, enum: ["tour"], required: true },
  ref_id: { type: Schema.Types.ObjectId, ref: "Tour", required: true },
  qty: { type: Number, required: true },
  unit_price: { type: Number, required: true }
}, { _id: true });

const bookingSchema = new Schema<IBooking>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ["pending","paid","cancelled"], default: "pending" },
  payment_id: String,
  items: { type: [bookingItemSchema], default: [] }
}, { timestamps: true });

export default model<IBooking>("Booking", bookingSchema);
