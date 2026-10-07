const mongoose = require("mongoose");

const MATERIAL_TYPES = [
    "plastic", "paper", "cardboard", "glass", "metal",
    "organic", "clothes", "furniture", "e-waste", "other",
];

const STATUS_VALUES = [
    "pending", "matched", "accepted", "scheduled",
    "collected", "processing", "completed", "cancelled",
];

const wasteListingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        materialType: {
            type: String,
            enum: MATERIAL_TYPES,
            required: [true, "Material type is required"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [0.01, "Quantity must be greater than zero"],
        },
        quantityUnit: {
            type: String,
            enum: ["kg", "lbs", "pieces", "bags", "boxes", "other"],
            default: "kg",
        },
        condition: {
            type: String,
            enum: ["good", "fair", "poor", "damaged"],
            default: "fair",
        },
        images: [{ type: String }],

        // Location
        pickupAddress: {
            type: String,
            required: [true, "Pickup address is required"],
            trim: true,
        },
        pickupCity: { type: String, trim: true },
        pickupState: { type: String, trim: true },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },

        // Scheduling preferences
        preferredDate: { type: Date },
        preferredTimeSlot: { type: String, trim: true },

        // Special waste
        isSpecialWaste: { type: Boolean, default: false },
        specialWasteCategory: { type: String, trim: true },

        // Workflow
        status: {
            type: String,
            enum: STATUS_VALUES,
            default: "pending",
            index: true,
        },
        matchedDestination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Destination",
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        // Collection tracking
        collectionDate: { type: Date },
        collectionNotes: { type: String, trim: true, maxlength: 2000 },
        processingNotes: { type: String, trim: true, maxlength: 2000 },
    },
    { timestamps: true }
);

wasteListingSchema.index({ user: 1, status: 1 });
wasteListingSchema.index({ assignedTo: 1, status: 1 });
wasteListingSchema.index({ materialType: 1 });

// Export enum arrays for reuse in controllers
wasteListingSchema.statics.MATERIAL_TYPES = MATERIAL_TYPES;
wasteListingSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model("WasteListing", wasteListingSchema);
