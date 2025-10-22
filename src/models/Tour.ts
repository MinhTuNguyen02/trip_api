// src/models/Tour.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ITour extends Document {
  _id: Types.ObjectId;
  destination_id: Types.ObjectId;   // required
  title: string;
  summary: string;
  description?: string;
  price: number;
  duration_hr: number;
  start_times: string[];
  images: string[];
  policy?: string;
  capacity?: number;
  rating_avg?: number;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tourSchema = new Schema<ITour>({
  destination_id: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  duration_hr: { type: Number, default: 4 },
  start_times: { type: [String], default: [] },
  images: { type: [String], default: [] },
  policy: String,
  capacity: { type: Number, default: 20 },
  rating_avg: { type: Number, default: 4.5 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default model<ITour>("Tour", tourSchema);
