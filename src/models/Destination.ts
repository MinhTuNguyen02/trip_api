import { Schema, model } from "mongoose";

/**
 * Destination: Điểm đến (ví dụ: Đà Nẵng, Đà Lạt, Phú Quốc)
 * - Dùng cho việc nhóm Tour & gợi ý lịch trình
 */

const destinationSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    region: {
      type: String, // Miền Bắc / Miền Trung / Miền Nam / Tây Nguyên
      default: "Miền Trung"
    },
    description: {
      type: String,
      default: ""
    },
    images: {
      type: [String],
      default: []
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Destination = model("Destination", destinationSchema);
export default Destination;
