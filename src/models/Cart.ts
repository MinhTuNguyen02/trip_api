// src/models/Cart.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ICartItem {
  _id: Types.ObjectId;         // <-- thêm dòng này
  type: "tour";
  ref_id: Types.ObjectId;      // luôn là ObjectId
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
    qty: { type: Number, required: true },
    unit_price: { type: Number, required: true }
  },
  { _id: true } // subdocument có _id
);

const cartSchema = new Schema<ICart>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true }
);

export default model<ICart>("Cart", cartSchema);
