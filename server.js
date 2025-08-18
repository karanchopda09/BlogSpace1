import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

// ------------------- CORS -------------------
// Allow frontend requests (React dev server usually on http://localhost:5173)
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
  origin: "https://ghastly-strong-bullfrog.ngrok-free.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight requests
app.options("*", cors());

// ------------------- MIDDLEWARE -------------------
app.use(express.json());

// ------------------- MONGOOSE SETUP -------------------
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/blogDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// ------------------- USER MODEL -------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// ------------------- BLOG MODEL -------------------
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Blog = mongoose.model("Blog", blogSchema);

// ------------------- AUTH ROUTES -------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "Please fill all fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Please provide email and password" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ------------------- AUTH MIDDLEWARE -------------------
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ------------------- BLOG ROUTES -------------------
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).populate("author", "username");
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

app.get("/api/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate("author", "username");
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blog" });
  }
});

app.post("/api/blogs", authMiddleware, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) return res.status(400).json({ error: "Please fill all fields" });

    const blog = new Blog({ title, content, category, author: req.userId });
    const savedBlog = await blog.save();
    res.status(201).json(savedBlog);
  } catch (err) {
    res.status(500).json({ error: "Failed to create blog" });
  }
});

app.put("/api/blogs/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    if (blog.author.toString() !== req.userId) return res.status(403).json({ error: "Not authorized" });

    const updatedBlog = await Blog.findByIdAndUpdate(id, { title, content, category }, { new: true, runValidators: true });
    res.json(updatedBlog);
  } catch (err) {
    res.status(500).json({ error: "Failed to update blog" });
  }
});

app.delete("/api/blogs/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    if (blog.author.toString() !== req.userId) return res.status(403).json({ error: "Not authorized" });

    await Blog.findByIdAndDelete(id);
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete blog" });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
