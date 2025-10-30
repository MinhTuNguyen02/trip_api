// src/models/Booking.ts
import { Schema, model, Types, Document } from "mongoose";

export type BookingStatus  = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus  = "unpaid"  | "paid"      | "failed"    | "refunded";

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;               // -> User

  // ---- 1 booking = 1 tour option ----
  tour_id: Types.ObjectId;               // -> Tour
  option_id: Types.ObjectId;             // -> TourOption
  start_date: Date;                      // YYYY-MM-DD (UTC 00:00)
  start_time?: string;                   // "HH:mm"
  qty: number;                           // số vé/người
  unit_price: number;                    // giá tại thời điểm đặt
  total: number;                         // server tính = qty * unit_price

  // Snapshot chống thay đổi dữ liệu gốc
  snapshot_title?: string;
  snapshot_destination_id?: Types.ObjectId;   // -> Destination
  snapshot_destination_name?: string;

  // Trạng thái
  status: BookingStatus;                 // tiến trình dịch vụ
  payment_status: PaymentStatus;         // tiến trình thanh toán
  payment_id?: Types.ObjectId;           // -> Payment

  // Thông tin liên hệ & ghi chú
  contact_name?: string;
  contact_phone?: string;
  note?: string;

  // NEW: điểm đón / hướng dẫn đón khách
  pickup_note?: string;                  // vd: “lên xe của Raumanian ở bến xe gần nhất”

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    user_id:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    tour_id:   { type: Schema.Types.ObjectId, ref: "Tour", required: true, index: true },
    option_id: { type: Schema.Types.ObjectId, ref: "TourOption", required: true, index: true },
    start_date:{ type: Date, required: true },
    start_time:{ type: String },
    qty:       { type: Number, required: true, min: 1 },
    unit_price:{ type: Number, required: true, min: 0 },
    total:     { type: Number, required: true, min: 0 },

    snapshot_title:            String,
    snapshot_destination_id:   { type: Schema.Types.ObjectId, ref: "Destination" },
    snapshot_destination_name: String,

    status:         { type: String, enum: ["pending","confirmed","cancelled","completed"], default: "pending", index: true },
    payment_status: { type: String, enum: ["unpaid","paid","failed","refunded"],           default: "unpaid" },
    payment_id:     { type: Schema.Types.ObjectId, ref: "Payment" },

    contact_name: String,
    contact_phone:String,
    note:         String,

    // NEW: điểm đón/hướng dẫn đón — tạm thời fix cứng theo yêu cầu
    pickup_note:  { type: String},
  },
  { timestamps: true }
);

// Tính tổng trước khi validate (phòng client gửi sai)
bookingSchema.pre("validate", function (next) {
  this.total = (this.qty || 0) * (this.unit_price || 0);
  next();
});

// Gợi ý index để list & lọc nhanh
bookingSchema.index({ user_id: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ option_id: 1, start_date: 1 });

export default model<IBooking>("Booking", bookingSchema);
