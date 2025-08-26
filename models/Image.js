import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  filename: String,
  data: String,       // base64 string
  contentType: String // e.g., "image/png"
});

export default mongoose.model("Image", imageSchema);
