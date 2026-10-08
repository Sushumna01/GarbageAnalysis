const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const mlRoutes = require("./routes/ml");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ml", mlRoutes);
app.use("/api/categories", require("./routes/categories"));
app.use("/api/classifications", require("./routes/classifications"));
app.use("/api/waste", require("./routes/waste"));
app.use("/api/destinations", require("./routes/destinations"));
app.use("/api/matches", require("./routes/matches"));
app.use("/api/collections", require("./routes/collections"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "garbage-analysis-backend", status: "ready" });
});

app.get("/", (req, res) => {
    res.json({ message: "GarbageAnalysis API is running" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.name === "MulterError") {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Image exceeds the upload size limit" : error.message });
    }
    if (error.message && error.message.startsWith("Only JPEG")) {
        return res.status(415).json({ message: error.message });
    }
    if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large" });
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({ message: "Invalid JSON body" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) return res.status(409).json({ message: "A resource with that value already exists" });
    console.error(error);
    return res.status(500).json({ message: "Server error" });
});

const start = async () => {
    if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET === "your_jwt_secret_here" ||
        process.env.JWT_SECRET === "replace_with_a_random_secret_at_least_32_characters_long"
    ) {
        throw new Error("Set a secure JWT_SECRET in the environment before starting the API");
    }
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
});
