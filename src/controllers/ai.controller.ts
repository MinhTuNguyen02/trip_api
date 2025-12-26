// src/controllers/ai.controller.ts
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import http from "http";
import https from "https";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==== IMPORT MÔ HÌNH VÀ UTILS ====
import Destination from "../models/Destination";
import POI from "../models/POI";
import { buildContextFromDb, chatOnce } from "../utils/ai.service";

// ==== CẤU HÌNH GEMINI (Cho Suggest) ====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ===================================================================
// 1) Gợi ý lịch trình: DÙNG GEMINI + ĐỌC DATABASE (RAG)
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
        return res.status(400).json({ message: "Destination and days are required" });
      }

      // --- BƯỚC 1: ĐỌC DATABASE ---
      const regex = new RegExp(destination.trim(), "i");
      const [destDocs, poiDocs] = await Promise.all([
        Destination.find({ name: regex }).limit(5).lean(),
        POI.find({ $or: [{ city: regex }, { address: regex }] }).limit(20).lean()
      ]);

      const dbContext = buildContextFromDb({
        destinations: destDocs.map((d: any) => ({ name: d.name, summary: d.summary })),
        pois: poiDocs.map((p: any) => ({ name: p.name, address: p.address, category: p.category }))
      });

      // --- BƯỚC 2: GỬI CHO GEMINI ---
      const prompt = `
Bạn là chuyên gia du lịch. Hãy gợi ý lịch trình ${days} ngày tại ${destination}.
Ngân sách: ${budget ?? "linh hoạt"} VND. Sở thích: ${interests ?? "tự do"}.

DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG:
${dbContext}

YÊU CẦU: 
1. Ưu tiên đưa các địa điểm trong "DỮ LIỆU THỰC TẾ" vào lịch trình.
2. Trả về DUY NHẤT 1 mảng JSON Array các object: {"day": number, "plan": "string"}.
3. Không trả về văn bản thừa.
`.trim();

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.3 
        },
      });

      const itinerary = JSON.parse(result.response.text());
      return res.json(itinerary);

    } catch (err) {
      console.error("Gemini Suggest Error:", err);
      return next(err);
    }
  },
};

// ===================================================================
// 2) Chat box: QUAY LẠI DÙNG OLLAMA
// ===================================================================
export const AiChatService = {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, history = [], locale = "vi", place } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      // 1) Lấy context ngắn từ DB (tùy chọn cho Ollama đỡ nặng)
      let context = "";
      if (place) {
        const poiDocs = await POI.find({ city: new RegExp(place, "i") }).limit(10).lean();
        context = poiDocs.map(p => p.name).join(", ");
      }

      // 2) Build Prompt cho Ollama
      const system = locale === "vi" 
        ? "Bạn là trợ lý du lịch. Trả lời ngắn gọn." 
        : "You are a travel assistant. Be concise.";
      
      const userContent = place 
        ? `Đang ở: ${place}. Các chỗ gần đây: ${context}. Câu hỏi: ${message} `
        : message;

      // 3) Gọi Ollama qua helper chatOnce (Sử dụng chuẩn Ollama API)
      const replyText = await chatOnce(
        [{ role: "system", content: system }, ...history, { role: "user", content: userContent }],
        {
          temperature: 0.7,
          maxTokens: 500,
        }
      );

      return res.json({ reply: replyText || "Ollama không phản hồi." });

    } catch (err) {
      console.error("Ollama Chat Error:", err);
      return next(err);
    }
  },
};

