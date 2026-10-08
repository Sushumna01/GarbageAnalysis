const express = require("express");
const multer = require("multer");
const { classifyImage } = require("../controllers/mlController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

router.get("/health", async (req, res) => {
  const mlServiceUrl = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
  try {
    const response = await fetch(mlServiceUrl);
    const service = await response.json();
    if (!response.ok || service.model_loaded !== true) {
      return res.status(503).json({
        ok: false,
        service: "garbage-analysis-backend",
        status: "model_unavailable",
        message: "The ML service is running, but no trained model is loaded.",
      });
    }
    return res.json({ ok: true, service: "garbage-analysis-backend", status: "ready" });
  } catch (error) {
    console.error("ML service health check failed:", error);
    return res.status(503).json({
      ok: false,
      service: "garbage-analysis-backend",
      status: "ml_service_offline",
      message: "The Python ML service is not reachable.",
    });
  }
});

router.post("/predict", upload.single("file"), classifyImage);

module.exports = router;
