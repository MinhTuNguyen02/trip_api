import { Schema, model, Types, Document } from "mongoose";

export interface IPayment extends Document {
  _id: Types.ObjectId;
  provider: "payos";
  status: "created" | "processing" | "succeeded" | "failed" | "canceled";
  amount: number;
  intent_id: string;   // với payOS: lưu orderCode
  payload: any;
  user_id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  provider: { type: String, default: "payos" },
  status: { type: String, enum: ["created","processing","succeeded","failed","canceled"], default: "created" },
  amount: { type: Number, required: true },
  intent_id: { type: String, required: true, unique: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default model<IPayment>("Payment", paymentSchema);
