// src/controllers/ai.controller.ts
import axios from "axios";
import http from "http";
import https from "https";
import { Request, Response, NextFunction } from "express";

// ==== IMPORT MÔ HÌNH VÀ UTILS (bắt buộc) ====
import Destination from "../models/Destination";
import POI from "../models/POI";
import { buildContextFromDb, chatOnce } from "../utils/ai.service";

// ==== ENV & AXIOS (đã ép IPv4 cho phần /suggest) ====
const RAW_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_HOST = RAW_HOST.replace("localhost", "127.0.0.1"); // phòng .env dùng localhost
const MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";

const axiosOllama = axios.create({
  baseURL: OLLAMA_HOST,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
});

// ===================================================================
// 1) Gợi ý lịch trình (trả JSON mảng {day, plan}) – dùng /api/generate
// ===================================================================
export const AiService = {
  async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      const { destination, days, budget, interests } = req.body as {
        destination: string;
        days: number;
        budget?: number;
        interests?: string;
      };

      if (!destination || !days) {
        return res
          .status(400)
          .json({ message: "Destination and days are required" });
      }

      const prompt = `
Bạn là chuyên gia du lịch. Hãy gợi ý lịch trình ${days} ngày tại ${destination},
ngân sách khoảng ${budget ?? "không rõ"} VND/người, sở thích: ${
        interests ?? "tự do"
      }.
Chỉ trả về JSON Array hợp lệ, ví dụ:
[
  {"day": 1, "plan": "mô tả ngắn"},
  {"day": 2, "plan": "mô tả ngắn"}
]
`.trim();

      const resp = await axiosOllama.post("/api/generate", {
        model: MODEL,
        prompt,
        stream: false,
      });

      const raw = String(resp.data?.response ?? "");
      const cleaned = raw.replace(/```json|```/g, "").trim();

      let itinerary: unknown;
      try {
        itinerary = JSON.parse(cleaned);
      } catch {
        itinerary = [{ day: 1, plan: cleaned || "Không có dữ liệu." }];
      }

      return res.json(itinerary);
    } catch (err) {
      console.error("AI Error:", err);
      return next(err);
    }
  },
};

// ===================================================================
// 2) Chat box biết dữ liệu DB – dùng utils.chatOnce (Ollama /api/chat)
// ===================================================================
export const AiChatService = {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, history = [], locale = "vi", place } = req.body as {
        message: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        locale?: "vi" | "en";
        place?: string; // tỉnh/thành người dùng nhập trong widget
      };

      if (!message?.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      // 1) Lấy dữ liệu thật theo 'place' (nếu có)
      let destDocs: any[] = [];
      let poiDocs: any[] = [];

      if (place?.trim()) {
        const regex = new RegExp(place.trim(), "i");

        destDocs = await Destination.find({
          $or: [{ name: regex }, { region: regex }, { country: regex }],
        })
          .limit(20)
          .lean()
          .catch(() => []);

        // Tuỳ schema POI của bạn: city/province/address/destinationId...
        poiDocs = await POI.find({
          $or: [{ name: regex }, { address: regex }, { city: regex }, { province: regex }],
        })
          .limit(50)
          .lean()
          .catch(() => []);
      }

      // 2) Build context ngắn gọn (cắt bớt để prompt không quá dài)
      const context = buildContextFromDb({
        destinations: destDocs.slice(0, 15).map((d: any) => ({
          name: d.name,
          region: d.region,
          summary: d.summary,
        })),
        pois: poiDocs.slice(0, 40).map((p: any) => ({
          name: p.name,
          category: p.category,
          openHours: p.openHours,
          address: p.address,
        })),
      });

      // 3) Lắp prompt
      const system =
        locale === "vi"
          ? "Bạn là trợ lý du lịch Việt Nam. Trả lời ngắn gọn, đúng trọng tâm, ưu tiên gợi ý theo dữ liệu cung cấp (nếu phù hợp)."
          : "You are a Vietnam travel assistant. Be concise and ground answers in provided data when relevant.";

      const user = [
        place ? `Địa phương quan tâm: ${place}` : null,
        context ? `Dữ liệu tham chiếu:\n${context}` : null,
        "",
        `Câu hỏi: ${message}`,
      ]
        .filter(Boolean)
        .join("\n");

      // 4) Gọi LLM (non-stream) qua helper chatOnce (đã dùng OLLAMA_HOST bên utils)
      const replyText = await chatOnce(
        [{ role: "system", content: system }, ...history, { role: "user", content: user }],
        {
          temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
          maxTokens: Number(process.env.AI_MAX_TOKENS ?? 800),
        }
      );

      return res.json({ reply: replyText || "Xin lỗi, mình chưa có câu trả lời." });
    } catch (err) {
      console.error("AI Chat Error:", err);
      return next(err);
    }
  },
};
