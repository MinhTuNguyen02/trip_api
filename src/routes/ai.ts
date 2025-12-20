import express from "express";
import { AiService, AiChatService } from "../controllers/ai.controller";
const router = express.Router();

router.post("/suggest", AiService.suggest);
router.post("/chat", AiChatService.chat);

export default router;
