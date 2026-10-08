const Classification = require("../models/Classification");
const mongoose = require("mongoose");
const categories = require("../config/categories");

const classifyImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Upload an image using the 'image' field" });
    }

    const mlApiUrl = (process.env.ML_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

    let predictionResponse;
    try {
        predictionResponse = await fetch(`${mlApiUrl}/predict`, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(Number(process.env.ML_API_TIMEOUT_MS) || 30000),
        });
    } catch (error) {
        const timedOut = error.name === "TimeoutError";
        return res.status(503).json({
            message: timedOut ? "Classification service timed out" : "Classification service is unavailable",
        });
    }

    if (!predictionResponse.ok) {
        const status = predictionResponse.status === 503 ? 503 : 502;
        return res.status(status).json({ message: "Classification service could not process the image" });
    }

    let prediction;
    try {
        prediction = await predictionResponse.json();
    } catch (error) {
        return res.status(502).json({ message: "Classification service returned an invalid response" });
    }

    let category = prediction && typeof prediction.class === "string"
        ? prediction.class.trim().toLowerCase()
        : "";
    if (category === "general" || category === "general waste") category = "other";
    const confidence = Number(prediction.confidence);
    if (!Object.hasOwn(categories, category) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        return res.status(502).json({ message: "Classification service returned an invalid prediction" });
    }

    const record = await Classification.create({
        user: req.user._id,
        category,
        confidence,
        fileName: req.file.originalname,
        guidance: categories[category].guidance,
    });

    res.status(201).json({
        classification: {
            _id: record._id,
            category: record.category,
            confidence: record.confidence,
            fileName: record.fileName,
            guidance: record.guidance,
            createdAt: record.createdAt,
        },
    });
};

const getHistory = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { user: req.user._id };
    const [items, total] = await Promise.all([
        Classification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Classification.countDocuments(filter),
    ]);

    const results = items.map((item) => ({
        ...item,
        guidance: item.guidance || categories[item.category]?.guidance,
    }));
    res.json({ items: results, page, limit, total, pages: Math.ceil(total / limit) });
};

const getSummary = async (req, res) => {
    const [total, grouped, latest] = await Promise.all([
        Classification.countDocuments({ user: req.user._id }),
        Classification.aggregate([
            { $match: { user: req.user._id } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        Classification.findOne({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const byCategory = Object.fromEntries(Object.keys(categories).map((category) => [category, 0]));
    for (const item of grouped) byCategory[item._id] = item.count;
    const latestResult = latest
        ? { ...latest, guidance: latest.guidance || categories[latest.category]?.guidance }
        : null;
    res.json({ total, byCategory, latest: latestResult });
};

const deleteClassification = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid classification ID" });
    }
    const deleted = await Classification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Classification not found" });
    return res.status(204).end();
};

module.exports = { classifyImage, getHistory, getSummary, deleteClassification };
