// src/utils/ai.service.ts
import axios from "axios";
import http from "http";
import https from "https";

const RAW_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
// phòng khi ai đó ghi "localhost"
export const OLLAMA_HOST = RAW_HOST.replace("localhost", "127.0.0.1");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";

// axios instance ép IPv4
const axiosOllama = axios.create({
  baseURL: OLLAMA_HOST,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
});

// ====== BUILD CONTEXT (giữ nguyên style cũ của bạn) ======
export function buildContextFromDb(payload: {
  destinations?: Array<{ name?: string; region?: string; summary?: string }>;
  pois?: Array<{ name?: string; category?: string; openHours?: string; address?: string }>;
}) {
  const parts: string[] = [];

  if (payload.destinations?.length) {
    parts.push("== Điểm đến ==");
    for (const d of payload.destinations.slice(0, 20)) {
      parts.push(`- ${d.name}${d.region ? ` (${d.region})` : ""}${d.summary ? `: ${d.summary}` : ""}`);
    }
  }

  if (payload.pois?.length) {
    parts.push("== POI ==");
    for (const p of payload.pois.slice(0, 50)) {
      const extra = [p.category, p.openHours, p.address].filter(Boolean).join(" • ");
      parts.push(`- ${p.name}${extra ? ` — ${extra}` : ""}`);
    }
  }

  return parts.join("\n");
}

// ====== CHAT ONCE qua Ollama /api/chat (non-stream) ======
export async function chatOnce(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const body: any = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {},
  };
  if (typeof opts?.temperature === "number") body.options.temperature = opts.temperature;
  if (typeof opts?.maxTokens === "number") body.options.num_predict = opts.maxTokens;

  const resp = await axiosOllama.post("/api/chat", body);

  // Ollama /api/chat trả về { message: { role, content }, ... }
  const content =
    resp.data?.message?.content ??
    resp.data?.response ?? // fallback nếu dùng /generate nhầm
    "";

  return String(content);
}
