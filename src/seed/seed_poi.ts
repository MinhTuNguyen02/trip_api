// scripts/seed_pois.ts
import axios from "axios";

// === CẤU HÌNH ===
const BASE = process.env.BASE_URL ?? "http://localhost:5124/api";
const TOKEN = process.env.ADMIN_TOKEN ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGY5YWU3M2I0ZGRlZThkMTNmMzBkMzMiLCJlbWFpbCI6ImFkbWluMUBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEyODYyMjcsImV4cCI6MTc2MTI5MzQyN30.UEzh3C_-svdOO5xk2WftEPDmYGUgsxWcLslp1jdDT50"; // Bearer token của admin (JWT)

// POI mẫu — bạn thêm/bớt tuỳ ý.
// Mỗi item chỉ cần destinationName hoặc destinationCode để map destination_id.
const POIS = [
  // Quảng Ninh
  {
    destinationName: "Quảng NInh",
    name: "Yên Tử",
    type: "sightseeing",
    duration_min: 180,
    open_from: "07:00",
    open_to: "17:30",
    price_est: 200000,
    tags: ["thiền", "núi", "cáp treo"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/3/3d/Yen_Tu_pagoda.jpg"],
  },
  {
    destinationName: "Quảng NInh",
    name: "Sun World Hạ Long",
    type: "sightseeing",
    duration_min: 240,
    open_from: "08:00",
    open_to: "21:00",
    price_est: 350000,
    tags: ["giải trí", "cáp treo", "điểm vui chơi"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/6/61/Sun_World_Ha_Long.jpg"],
  },

  // Ninh Bình
  {
    destinationName: "Ninh Bình",
    name: "Quần thể Tràng An",
    type: "nature",
    duration_min: 180,
    open_from: "07:00",
    open_to: "17:00",
    price_est: 250000,
    tags: ["thuyền", "hang động", "di sản"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/3/32/Trang_An_Ninh_Binh.jpg"],
  },
  {
    destinationName: "Ninh Bình",
    name: "Hang Múa",
    type: "sightseeing",
    duration_min: 120,
    open_from: "06:30",
    open_to: "18:00",
    price_est: 100000,
    tags: ["view cao", "check-in"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/6/6f/Hang_Mua_viewpoint.jpg"],
  },

  // Huế
  {
    destinationName: "TP. Huế",
    name: "Đại Nội Huế",
    type: "sightseeing",
    duration_min: 180,
    open_from: "07:00",
    open_to: "17:00",
    price_est: 200000,
    tags: ["cố đô", "di sản", "lịch sử"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/2/2d/Hue_Imperial_City.jpg"],
  },

  // Khánh Hòa
  {
    destinationName: "Khánh Hòa",
    name: "VinWonders Nha Trang",
    type: "sightseeing",
    duration_min: 360,
    open_from: "09:00",
    open_to: "20:00",
    price_est: 600000,
    tags: ["công viên giải trí", "cáp treo biển"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/2/20/Vinpearl_Cable_Car.jpg"],
  },
  {
    destinationName: "Khánh Hòa",
    name: "Bãi biển Nha Trang",
    type: "nature",
    duration_min: 180,
    open_from: "05:00",
    open_to: "19:00",
    price_est: 0,
    tags: ["tắm biển", "cảnh biển"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/1/1d/Nha_Trang_beach.jpg"],
  },

  // Tây Ninh
  {
    destinationName: "Tây Ninh",
    name: "Núi Bà Đen",
    type: "nature",
    duration_min: 240,
    open_from: "06:00",
    open_to: "17:00",
    price_est: 200000,
    tags: ["cáp treo", "leo núi"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/7/71/Nui_Ba_Den_Tay_Ninh.jpg"],
  },

  // Đồng Nai
  {
    destinationName: "Đồng Nai",
    name: "KDL Bửu Long",
    type: "sightseeing",
    duration_min: 180,
    open_from: "07:00",
    open_to: "18:00",
    price_est: 150000,
    tags: ["hồ", "núi đá", "chụp ảnh"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/6/6a/Buu_Long_tourist_area.jpg"],
  },

  // Đồng Tháp
  {
    destinationName: "Đồng Tháp",
    name: "Vườn quốc gia Tràm Chim",
    type: "nature",
    duration_min: 240,
    open_from: "06:00",
    open_to: "17:00",
    price_est: 150000,
    tags: ["sếu đầu đỏ", "sinh thái"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/4/49/Tram_Chim_Tam_Nong.jpg"],
  },

  // An Giang
  {
    destinationName: "An Giang",
    name: "Miếu Bà Chúa Xứ Núi Sam",
    type: "sightseeing",
    duration_min: 90,
    open_from: "06:00",
    open_to: "21:00",
    price_est: 0,
    tags: ["tín ngưỡng", "hành hương"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/3/37/Mieu_Ba_Chua_Xu.jpg"],
  },

  // Vĩnh Long
  {
    destinationName: "Vĩnh Long",
    name: "Cù lao An Bình",
    type: "nature",
    duration_min: 180,
    open_from: "07:00",
    open_to: "17:00",
    price_est: 0,
    tags: ["miệt vườn", "đi thuyền", "trái cây"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/0/04/Miet_vuon_Vinh_Long.jpg"],
  },

  // Cà Mau
  {
    destinationName: "Cà Mau",
    name: "Mũi Cà Mau",
    type: "nature",
    duration_min: 240,
    open_from: "06:00",
    open_to: "17:00",
    price_est: 100000,
    tags: ["cột mốc toạ độ", "rừng ngập mặn"],
    images: ["https://upload.wikimedia.org/wikipedia/commons/1/17/Mui_Ca_Mau.jpg"],
  },
] as const;

type Dest = { _id: string; name: string; code: string };

async function main() {
  if (!TOKEN) {
    console.error("❌ ADMIN_TOKEN chưa có. Set env ADMIN_TOKEN='Bearer <JWT>' rồi chạy lại.");
    process.exit(1);
  }

  const api = axios.create({
    baseURL: BASE,
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
  });

  // 1) Lấy toàn bộ destinations
  const { data: dests } = await api.get<Dest[]>("/destinations");
  const byName = new Map(dests.map(d => [d.name.trim().toLowerCase(), d._id]));
  const byCode = new Map(dests.map(d => [d.code.trim().toUpperCase(), d._id]));

  // 2) Duyệt POI và bắn POST
  for (const p of POIS) {
    const keyName = p.destinationName?.trim().toLowerCase();
    const keyCode = (p as any).destinationCode?.trim().toUpperCase();
    const destination_id = (keyName && byName.get(keyName)) || (keyCode && byCode.get(keyCode));

    if (!destination_id) {
      console.warn(`⚠️  Không tìm thấy destination cho: ${p.destinationName || (p as any).destinationCode}`);
      continue;
    }

    const body = {
      destination_id,
      name: p.name,
      type: p.type,
      duration_min: p.duration_min,
      open_from: p.open_from,
      open_to: p.open_to,
      price_est: p.price_est,
      tags: p.tags,
      images: p.images,
      is_active: true,
    };

    try {
      const { data: created } = await api.post("/pois", body);
      console.log(`✅ Created POI: ${created.name} → dest_id=${destination_id}`);
    } catch (err: any) {
      console.error(`❌ Failed POI: ${p.name}`, err?.response?.data || err.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
