const mongoose = require("mongoose");

const DESTINATION_TYPES = ["recycler", "ngo", "collection_center", "other"];

const ACCEPTED_MATERIALS = [
    "plastic", "paper", "cardboard", "glass", "metal",
    "organic", "clothes", "furniture", "e-waste", "other",
];

const destinationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        organizationName: {
            type: String,
            required: [true, "Organization name is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: DESTINATION_TYPES,
            required: [true, "Destination type is required"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        acceptedMaterials: {
            type: [{ type: String, enum: ACCEPTED_MATERIALS }],
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "At least one accepted material is required",
            },
        },
        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        contactPhone: { type: String, trim: true },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

destinationSchema.index({ isVerified: 1, isActive: 1 });
destinationSchema.index({ acceptedMaterials: 1 });

destinationSchema.statics.DESTINATION_TYPES = DESTINATION_TYPES;
destinationSchema.statics.ACCEPTED_MATERIALS = ACCEPTED_MATERIALS;

module.exports = mongoose.model("Destination", destinationSchema);
