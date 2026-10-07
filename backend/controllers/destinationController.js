const mongoose = require("mongoose");
const Destination = require("../models/Destination");
const User = require("../models/User");

// @desc    Create destination profile
// @route   POST /api/destinations
// @access  Private (destination role)
const createDestination = async (req, res) => {
    // Check if user already has a destination profile
    const existing = await Destination.findOne({ user: req.user._id });
    if (existing) {
        return res.status(409).json({ message: "You already have a destination profile" });
    }

    const {
        organizationName, type, description, acceptedMaterials,
        address, city, state, latitude, longitude,
        contactEmail, contactPhone,
    } = req.body;

    if (!organizationName || !type || !address || !acceptedMaterials) {
        return res.status(400).json({
            message: "organizationName, type, address, and acceptedMaterials are required",
        });
    }

    const destination = await Destination.create({
        user: req.user._id,
        organizationName,
        type,
        description,
        acceptedMaterials,
        address,
        city,
        state,
        latitude,
        longitude,
        contactEmail,
        contactPhone,
    });

    // Link destination profile to user
    await User.findByIdAndUpdate(req.user._id, { destinationProfile: destination._id });

    res.status(201).json(destination);
};

// @desc    Get current user's destination profile
// @route   GET /api/destinations/me
// @access  Private (destination role)
const getMyDestination = async (req, res) => {
    const destination = await Destination.findOne({ user: req.user._id }).lean();
    if (!destination) {
        return res.status(404).json({ message: "Destination profile not found. Create one first." });
    }
    res.json(destination);
};

// @desc    Update current user's destination profile
// @route   PUT /api/destinations/me
// @access  Private (destination role)
const updateDestination = async (req, res) => {
    const destination = await Destination.findOne({ user: req.user._id });
    if (!destination) {
        return res.status(404).json({ message: "Destination profile not found" });
    }

    const allowedFields = [
        "organizationName", "type", "description", "acceptedMaterials",
        "address", "city", "state", "latitude", "longitude",
        "contactEmail", "contactPhone", "isActive",
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            destination[field] = req.body[field];
        }
    }

    await destination.save();
    res.json(destination);
};

// @desc    Get all verified & active destinations (public list)
// @route   GET /api/destinations
// @access  Private
const getAllDestinations = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { isVerified: true, isActive: true };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.material) filter.acceptedMaterials = req.query.material;
    if (req.query.city) filter.city = { $regex: req.query.city, $options: "i" };

    const [items, total] = await Promise.all([
        Destination.find(filter)
            .select("-user")
            .sort({ organizationName: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Destination.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
};

// @desc    Get single destination by ID
// @route   GET /api/destinations/:id
// @access  Private
const getDestinationById = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid destination ID" });
    }

    const destination = await Destination.findOne({ _id: req.params.id, isVerified: true, isActive: true }).select("-user").lean();
    if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
    }
    res.json(destination);
};

// @desc    Verify a destination (admin only)
// @route   PATCH /api/destinations/:id/verify
// @access  Private (admin)
const verifyDestination = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid destination ID" });
    }

    const destination = await Destination.findById(req.params.id);
    if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
    }

    destination.isVerified = true;
    await destination.save();

    res.json({ message: "Destination verified", destination });
};

module.exports = {
    createDestination,
    getMyDestination,
    updateDestination,
    getAllDestinations,
    getDestinationById,
    verifyDestination,
};
