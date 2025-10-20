import { Schema, model, Types } from "mongoose";

/**
 * Tour: Gói du lịch hoặc hoạt động tại một điểm đến
 * - Liên kết với Destination qua destination_id
 * - Dùng cho phần hiển thị, tìm kiếm, giỏ hàng, checkout
 */

const tourSchema = new Schema(
  {
    destination_id: {
      type: Types.ObjectId,
      ref: "Destination",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration_hr: {
      type: Number, // thời lượng tour (giờ)
      default: 4
    },
    start_times: {
      type: [String], // VD: ["08:00", "13:30"]
      default: []
    },
    images: {
      type: [String],
      default: []
    },
    policy: {
      type: String, // chính sách huỷ/điều khoản
      default: ""
    },
    capacity: {
      type: Number,
      default: 20
    },
    rating_avg: {
      type: Number,
      default: 4.5
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Tour = model("Tour", tourSchema);
export default Tour;
