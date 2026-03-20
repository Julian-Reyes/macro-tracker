import "dotenv/config";
import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { mealsRouter } from "./routes/meals.js";
import { nutritionRouter } from "./routes/nutrition.js";
import { goalsRouter } from "./routes/goals.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(process.env.UPLOAD_DIR || "./uploads"));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/goals", goalsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: process.env.AI_PROVIDER || "gemini" });
});

// Serve static React build in production
const distPath = join(__dirname, "../../dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Macro Tracker API running on port ${PORT}`);
  console.log(`AI provider: ${process.env.AI_PROVIDER || "gemini"}`);
});
