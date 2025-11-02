// src/models/Ticket.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ITicket extends Document {
  _id: Types.ObjectId;
  booking_id: Types.ObjectId; 
  passenger?: { name?: string; phone?: string; address?: string };
  code: string;               
  qr_payload: string;         
  status: "valid" | "used" | "refunded" | "void";
  used_at?: Date;
  pickup_note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    passenger: {
      name: String,
      phone: String,
      address: String,
    },
    code: { type: String, required: true, unique: true, index: true },
    qr_payload: { type: String, required: true },
    status: { type: String, enum: ["valid","used","refunded","void"], default: "valid", index: true },
    used_at: Date,
    pickup_note: String,
  },
  { timestamps: true }
);

export default model<ITicket>("Ticket", ticketSchema);
