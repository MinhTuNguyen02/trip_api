// src/models/Cart.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ICartItem {
  _id: Types.ObjectId;         
  type: "tour";
  ref_id: Types.ObjectId;      
  option_id: Types.ObjectId;
  qty: number;
  unit_price: number;
}

export interface ICart extends Document {
  user_id: Types.ObjectId;
  items: ICartItem[];
}

const cartItemSchema = new Schema<ICartItem>(
  {
    type: { type: String, enum: ["tour"], required: true },
    ref_id: { type: Schema.Types.ObjectId, ref: "Tour", required: true },
    option_id: { type: Schema.Types.ObjectId, ref: "TourOption", required: true },
    qty: { type: Number, required: true },
    unit_price: { type: Number, required: true }
  },
  { _id: true } 
);

const cartSchema = new Schema<ICart>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true }
);
cartSchema.index({ user_id: 1 });
export default model<ICart>("Cart", cartSchema);
