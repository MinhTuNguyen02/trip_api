// src/models/FlightQuote.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IFlightQuote extends Document {
  _id: Types.ObjectId;
  itinerary_id: Types.ObjectId;
  origin: string;
  dest: string;
  depart_at: Date;
  return_at: Date;
  price: number;
  deeplink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const flightQuoteSchema = new Schema<IFlightQuote>({
  itinerary_id: { type: Schema.Types.ObjectId, ref: "Itinerary", required: true },
  origin: { type: String, required: true },
  dest: { type: String, required: true },
  depart_at: { type: Date, required: true },
  return_at: { type: Date, required: true },
  price: { type: Number, required: true },
  deeplink: String
}, { timestamps: true });

export default model<IFlightQuote>("FlightQuote", flightQuoteSchema);
