import { Schema, model, Types, Document } from "mongoose";

export interface ITour extends Document {
  _id: Types.ObjectId;
  destination_id: Types.ObjectId;
  departure_id: Types.ObjectId;
  title: string;
  summary: string;
  description?: string;
  price: number;
  duration_hr: number;
  images: string[];
  policy?: string;
  rating_avg?: number;
  is_active: boolean;
  poi_ids?: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const tourSchema = new Schema<ITour>(
  {
    destination_id: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
    departure_id: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    duration_hr: { type: Number, default: 4 },
    images: { type: [String], default: [] },
    policy: String,
    rating_avg: { type: Number, default: 4.5 },
    is_active: { type: Boolean, default: true },
    poi_ids: [{ type: Schema.Types.ObjectId, ref: "POI", default: [] }],
  },
  { timestamps: true }
);

export default model<ITour>("Tour", tourSchema);
