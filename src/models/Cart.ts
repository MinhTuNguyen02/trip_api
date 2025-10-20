import { Schema, model, Types } from "mongoose";
const Cart = model("Cart", new Schema({
  user_id: { type: Types.ObjectId, ref: "User", required: true },
  items: [{
    type: { type: String, enum: ["tour"], required: true },
    ref_id: { type: Types.ObjectId, refPath: "items.type" },
    qty: { type: Number, default: 1 },
    unit_price: Number
  }]
}, { timestamps: true }));
export default Cart;
