const mongoose = require("mongoose");
const WasteListing = require("../models/WasteListing");
const Destination = require("../models/Destination");

/**
 * Haversine distance in km between two lat/lng pairs.
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @desc    Find matching destinations for a waste listing
// @route   GET /api/matches/:wasteId
// @access  Private
const findMatches = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.wasteId)) {
        return res.status(400).json({ message: "Invalid waste listing ID" });
    }

    const listing = await WasteListing.findById(req.params.wasteId).lean();
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }

    // Only the listing owner or admin can search matches
    if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
    }

    // Find verified + active destinations that accept this material
    const destinations = await Destination.find({
        isVerified: true,
        isActive: true,
        acceptedMaterials: listing.materialType,
    })
        .select("-user")
        .lean();

    // Calculate distance if listing has coordinates
    const hasCoords =
        typeof listing.latitude === "number" && typeof listing.longitude === "number";

    const results = destinations.map((dest) => {
        const destHasCoords =
            typeof dest.latitude === "number" && typeof dest.longitude === "number";
        const distance =
            hasCoords && destHasCoords
                ? Math.round(haversineKm(listing.latitude, listing.longitude, dest.latitude, dest.longitude) * 10) / 10
                : null;
        return { ...dest, distance };
    });

    // Sort by distance (nulls at end)
    results.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
    });

    res.json({ wasteListingId: listing._id, materialType: listing.materialType, matches: results });
};

// @desc    Assign a destination to a waste listing
// @route   POST /api/matches/:wasteId/assign
// @access  Private (owner)
const assignMatch = async (req, res) => {
    const { destinationId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.wasteId)) {
        return res.status(400).json({ message: "Invalid waste listing ID" });
    }
    if (!destinationId || !mongoose.Types.ObjectId.isValid(destinationId)) {
        return res.status(400).json({ message: "Valid destinationId is required" });
    }

    const listing = await WasteListing.findById(req.params.wasteId);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }
    if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
    }
    if (listing.status !== "pending") {
        return res.status(400).json({ message: "Only pending listings can be matched" });
    }

    const destination = await Destination.findById(destinationId);
    if (!destination || !destination.isVerified || !destination.isActive) {
        return res.status(404).json({ message: "Destination not found or not available" });
    }
    if (!destination.acceptedMaterials.includes(listing.materialType)) {
        return res.status(400).json({ message: "Destination does not accept this material type" });
    }

    listing.matchedDestination = destination._id;
    listing.assignedTo = destination.user;
    listing.status = "matched";
    await listing.save();

    res.json({ message: "Destination assigned", listing });
};

module.exports = { findMatches, assignMatch };
