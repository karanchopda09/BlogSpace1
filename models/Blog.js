import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: "General" },
    image: { type: String }, // path to uploaded file
    author: { type: String }, // store user ID
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
