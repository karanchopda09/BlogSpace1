import express from "express";
import multer from "multer";
import Image from "../models/Image.js";

const router = express.Router();
const upload = multer(); // store in memory

// Upload image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const newImage = new Image({
      filename: req.file.originalname,
      data: req.file.buffer.toString("base64"),
      contentType: req.file.mimetype,
    });

    await newImage.save();

    res.json({ id: newImage._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get image by ID
router.get("/:id", async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).send("Not found");

    res.set("Content-Type", image.contentType);
    res.send(Buffer.from(image.data, "base64"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
