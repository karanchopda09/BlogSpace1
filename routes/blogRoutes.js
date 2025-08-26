import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import Blog from "../models/Blog.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- ENSURE UPLOADS FOLDER -------------------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads folder");
}

// ------------------- MULTER CONFIG -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ------------------- CREATE BLOG -------------------
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    console.log("✅ req.body:", req.body);
    console.log("✅ req.file:", req.file);

    const { title, content, category } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    console.log('content: ', content);
    console.log('title: ', title);
    console.log('category: ', category);

    console.log('imagePath: ', imagePath);
    if (!title || !content || !category || !imagePath) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    const newBlog = new Blog({
      title,
      content,
      category,
      image: imagePath,
      author: req.user.id,
    });

    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error("❌ Blog creation error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ------------------- GET ALL BLOGS -------------------
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (error) {
    console.error("❌ Fetch blogs error:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

export default router;
