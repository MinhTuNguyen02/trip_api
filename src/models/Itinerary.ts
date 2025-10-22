// src/models/Itinerary.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IItinerary extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  destination_id: Types.ObjectId;
  start_date: Date;
  end_date: Date;
  budget?: number;
  prefs: string[];
  plan_json: any;
  price_est?: number;
  createdAt: Date;
  updatedAt: Date;
}

const itinerarySchema = new Schema<IItinerary>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  destination_id: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  budget: { type: Number, default: 0 },
  prefs: { type: [String], default: [] },
  plan_json: { type: Schema.Types.Mixed, required: true },
  price_est: { type: Number, default: 0 }
}, { timestamps: true });

export default model<IItinerary>("Itinerary", itinerarySchema);
