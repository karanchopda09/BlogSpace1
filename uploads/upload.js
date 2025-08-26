import express from "express";
import multer from "multer";
import path from "path";
import Blog from "../models/Blog.js";

const router = express.Router();

// ---------------- MULTER CONFIG ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------- CREATE BLOG ----------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { title, content, category = "General", author } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !content || !category || !imagePath) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    const blog = new Blog({
      title,
      content,
      category,
      image: imagePath,
      author,
    });

    const savedBlog = await blog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error("Blog creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------- GET ALL BLOGS ----------------
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (error) {
    console.error("Fetch blogs error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
