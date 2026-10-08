const mongoose = require("mongoose");
const categories = require("../config/categories");

const classificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        category: {
            type: String,
            enum: Object.keys(categories),
            required: true,
        },
        confidence: { type: Number, min: 0, max: 1, required: true },
        fileName: { type: String, maxlength: 255 },
        guidance: { type: String, required: true },
    },
    { timestamps: true }
);

classificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Classification", classificationSchema);
