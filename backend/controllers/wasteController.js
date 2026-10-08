const mongoose = require("mongoose");
const WasteListing = require("../models/WasteListing");

// @desc    Create a new waste listing
// @route   POST /api/waste
// @access  Private (user)
const createWasteListing = async (req, res) => {
    const {
        materialType, description, quantity, quantityUnit, condition,
        images, pickupAddress, pickupCity, pickupState,
        latitude, longitude, preferredDate, preferredTimeSlot,
        isSpecialWaste, specialWasteCategory,
    } = req.body;

    if (!materialType || !quantity || !pickupAddress) {
        return res.status(400).json({ message: "materialType, quantity, and pickupAddress are required" });
    }

    const listing = await WasteListing.create({
        user: req.user._id,
        materialType,
        description,
        quantity,
        quantityUnit,
        condition,
        images: Array.isArray(images) ? images.slice(0, 10) : [],
        pickupAddress,
        pickupCity,
        pickupState,
        latitude,
        longitude,
        preferredDate,
        preferredTimeSlot,
        isSpecialWaste: Boolean(isSpecialWaste),
        specialWasteCategory,
    });

    res.status(201).json(listing);
};

// @desc    Get current user's waste listings
// @route   GET /api/waste
// @access  Private
const getMyWasteListings = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { user: req.user._id };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.materialType) filter.materialType = req.query.materialType;

    const [items, total] = await Promise.all([
        WasteListing.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("matchedDestination", "organizationName type")
            .lean(),
        WasteListing.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
};

// @desc    Get a single waste listing by ID
// @route   GET /api/waste/:id
// @access  Private (owner or assigned destination)
const getWasteListingById = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id)
        .populate("matchedDestination", "organizationName type address city contactPhone contactEmail")
        .populate("user", "name email phone")
        .populate("assignedTo", "name email")
        .lean();

    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }

    // Allow owner, assigned destination user, or admin
    const isOwner = listing.user._id.toString() === req.user._id.toString();
    const isAssigned = listing.assignedTo && listing.assignedTo._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAssigned && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this listing" });
    }

    res.json(listing);
};

// @desc    Update own waste listing (only if pending)
// @route   PUT /api/waste/:id
// @access  Private (owner)
const updateWasteListing = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }
    if (listing.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this listing" });
    }
    if (listing.status !== "pending") {
        return res.status(400).json({ message: "Only pending listings can be updated" });
    }

    const allowedFields = [
        "materialType", "description", "quantity", "quantityUnit", "condition",
        "images", "pickupAddress", "pickupCity", "pickupState",
        "latitude", "longitude", "preferredDate", "preferredTimeSlot",
        "isSpecialWaste", "specialWasteCategory",
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            listing[field] = req.body[field];
        }
    }

    await listing.save();
    res.json(listing);
};

// @desc    Delete (cancel) own waste listing
// @route   DELETE /api/waste/:id
// @access  Private (owner)
const deleteWasteListing = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }
    if (listing.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to delete this listing" });
    }

    // Only pending or matched listings can be cancelled via delete
    if (!["pending", "matched"].includes(listing.status)) {
        return res.status(400).json({ message: "Cannot delete a listing that is already in progress" });
    }

    listing.status = "cancelled";
    await listing.save();
    res.json({ message: "Listing cancelled" });
};

// @desc    Cancel own waste listing explicitly
// @route   PATCH /api/waste/:id/cancel
// @access  Private (owner)
const cancelWasteListing = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }
    if (listing.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to cancel this listing" });
    }
    if (["completed", "cancelled"].includes(listing.status)) {
        return res.status(400).json({ message: `Cannot cancel a listing with status '${listing.status}'` });
    }

    listing.status = "cancelled";
    listing.matchedDestination = undefined;
    listing.assignedTo = undefined;
    await listing.save();
    res.json({ message: "Listing cancelled", listing });
};

module.exports = {
    createWasteListing,
    getMyWasteListings,
    getWasteListingById,
    updateWasteListing,
    deleteWasteListing,
    cancelWasteListing,
};
