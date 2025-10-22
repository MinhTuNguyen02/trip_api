// src/models/POI.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IPOI extends Document {
  _id: Types.ObjectId;
  destination_id: Types.ObjectId;
  name: string;
  type: "sightseeing" | "food" | "nature" | "nightlife" | "other";
  duration_min: number;
  open_from: string;
  open_to: string;
  price_est: number;
  tags: string[];
  geo?: { lat?: number; lng?: number };
  images: string[];
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const poiSchema = new Schema<IPOI>({
  destination_id: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["sightseeing","food","nature","nightlife","other"], default: "other" },
  duration_min: { type: Number, default: 90 },
  open_from: { type: String, default: "08:00" },
  open_to: { type: String, default: "21:00" },
  price_est: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  geo: { lat: Number, lng: Number },
  images: { type: [String], default: [] },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default model<IPOI>("POI", poiSchema);
