const mongoose = require("mongoose");
const WasteListing = require("../models/WasteListing");

// Valid status transitions — key is current status, value is allowed next statuses
const TRANSITIONS = {
    matched: ["accepted", "cancelled"],
    accepted: ["scheduled", "cancelled"],
    scheduled: ["collected", "cancelled"],
    collected: ["processing"],
    processing: ["completed"],
};

/**
 * Helper: load listing, validate ObjectId, check destination ownership,
 * and validate allowed transition.
 */
const transitionListing = async (req, res, targetStatus, extraUpdate) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }

    // Workflow actions belong only to the assigned destination user.
    const isAssigned = listing.assignedTo && listing.assignedTo.toString() === req.user._id.toString();
    if (!isAssigned || req.user.role !== "destination") {
        return res.status(403).json({ message: "Not authorized to modify this listing" });
    }

    const allowed = TRANSITIONS[listing.status];
    if (!allowed || !allowed.includes(targetStatus)) {
        return res.status(400).json({
            message: `Cannot transition from '${listing.status}' to '${targetStatus}'`,
        });
    }

    listing.status = targetStatus;
    if (extraUpdate) extraUpdate(listing, req.body);
    await listing.save();

    return res.json({ message: `Status updated to '${targetStatus}'`, listing });
};

// @desc    Accept a matched waste request
// @route   PATCH /api/collections/:id/accept
const acceptRequest = (req, res) => transitionListing(req, res, "accepted");

// @desc    Reject a matched waste request (back to pending so user can re-match)
// @route   PATCH /api/collections/:id/reject
const rejectRequest = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await WasteListing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ message: "Waste listing not found" });
    }

    const isAssigned = listing.assignedTo && listing.assignedTo.toString() === req.user._id.toString();
    if (!isAssigned || req.user.role !== "destination") {
        return res.status(403).json({ message: "Not authorized" });
    }

    if (listing.status !== "matched") {
        return res.status(400).json({ message: "Only matched listings can be rejected" });
    }

    // Reset to pending so user can find a new match
    listing.status = "pending";
    listing.matchedDestination = undefined;
    listing.assignedTo = undefined;
    await listing.save();

    res.json({ message: "Request rejected, listing returned to pending", listing });
};

// @desc    Schedule collection date
// @route   PATCH /api/collections/:id/schedule
const scheduleCollection = (req, res) => {
    if (!req.body?.collectionDate || !Number.isFinite(Date.parse(req.body.collectionDate))) {
        return res.status(400).json({ message: "A valid collectionDate is required" });
    }
    return transitionListing(req, res, "scheduled", (listing, body) => {
        listing.collectionDate = body.collectionDate;
        if (body.collectionNotes) listing.collectionNotes = body.collectionNotes;
    });
};

// @desc    Mark as collected
// @route   PATCH /api/collections/:id/collect
const markCollected = (req, res) =>
    transitionListing(req, res, "collected", (listing, body) => {
        if (body.collectionNotes) listing.collectionNotes = body.collectionNotes;
    });

// @desc    Mark as processing
// @route   PATCH /api/collections/:id/process
const markProcessing = (req, res) =>
    transitionListing(req, res, "processing", (listing, body) => {
        if (body.processingNotes) listing.processingNotes = body.processingNotes;
    });

// @desc    Mark as completed
// @route   PATCH /api/collections/:id/complete
const markCompleted = (req, res) =>
    transitionListing(req, res, "completed", (listing, body) => {
        if (body.processingNotes) listing.processingNotes = body.processingNotes;
    });

// @desc    Get requests assigned to current destination user
// @route   GET /api/collections
// @access  Private (destination)
const getDestinationRequests = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { assignedTo: req.user._id };

    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
        WasteListing.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("user", "name email phone")
            .populate("matchedDestination", "organizationName type")
            .lean(),
        WasteListing.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
};

module.exports = {
    acceptRequest,
    rejectRequest,
    scheduleCollection,
    markCollected,
    markProcessing,
    markCompleted,
    getDestinationRequests,
};
