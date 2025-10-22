// src/models/Destination.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IDestination extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  region?: string;
  description?: string;
  images: string[];
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const destinationSchema = new Schema<IDestination>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  region: String,
  description: String,
  images: { type: [String], default: [] },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default model<IDestination>("Destination", destinationSchema);
