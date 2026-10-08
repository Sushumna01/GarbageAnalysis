const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const mlRoutes = require("./routes/ml");

// Load environment variables
dotenv.config();

// Connect to MongoDB when configured
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ml", mlRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "garbage-analysis-backend", status: "ready" });
});

app.get("/", (req, res) => {
    res.json({ message: "GarbageAnalysis API is running" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
