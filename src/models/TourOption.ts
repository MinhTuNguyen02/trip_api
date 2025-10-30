import { Schema, model, Types, Document } from "mongoose";

export type TourOptionStatus = "open" | "full" | "closed" | "cancelled";

export interface ITourOption extends Document {
  _id: Types.ObjectId;
  tour_id: Types.ObjectId;           // -> Tour
  start_date: Date;                  // ngày khởi hành (UTC 00:00)
  start_time?: string;               // "08:00" | "19:30"... (HH:mm)
  capacity_total: number;            // tổng chỗ
  capacity_sold: number;             // đã bán
  cut_off_hours?: number;            // khoá đặt trước giờ xuất phát (mặc định 2h)
  status: TourOptionStatus;          // open | full | closed | cancelled

  createdAt: Date;
  updatedAt: Date;
}

const tourOptionSchema = new Schema<ITourOption>(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: "Tour", required: true, index: true },
    start_date: { type: Date, required: true, index: true },
    start_time: { type: String }, // validate ở controller
    capacity_total: { type: Number, required: true, min: 1 },
    capacity_sold: { type: Number, default: 0, min: 0 },
    cut_off_hours: { type: Number, default: 2, min: 0 },
    status: {
      type: String,
      enum: ["open", "full", "closed", "cancelled"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

// Một tour không nên có 2 option trùng ngày/giờ
tourOptionSchema.index({ tour_id: 1, start_date: 1, start_time: 1 }, { unique: true });

// Gợi ý index lọc nhanh option còn bán
tourOptionSchema.index({ status: 1, start_date: 1 });

export default model<ITourOption>("TourOption", tourOptionSchema);
