import { Router } from "express";
import multer from "multer";
import { cloudinary } from "../configs/cloudinary";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import streamifier from "streamifier";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const r = Router();

r.post("/", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file" });
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tours",
        // transformation: [{ width: 1600, crop: "limit" }]
      },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({ error: "Upload failed" });
        }
        res.json({ url: result.secure_url, public_id: result.public_id });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default r;
