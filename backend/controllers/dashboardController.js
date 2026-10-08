const WasteListing = require("../models/WasteListing");
const Destination = require("../models/Destination");
const User = require("../models/User");

// @desc    User dashboard summary
// @route   GET /api/dashboard/user
// @access  Private
const getUserDashboard = async (req, res) => {
    const userId = req.user._id;

    const [total, byStatus, byCategory, quantityByCategory] = await Promise.all([
        WasteListing.countDocuments({ user: userId }),
        WasteListing.aggregate([
            { $match: { user: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        WasteListing.aggregate([
            { $match: { user: userId } },
            { $group: { _id: "$materialType", count: { $sum: 1 } } },
        ]),
        WasteListing.aggregate([
            { $match: { user: userId } },
            { $group: { _id: "$materialType", totalQuantity: { $sum: "$quantity" } } },
        ]),
    ]);

    const statusMap = {};
    for (const s of byStatus) statusMap[s._id] = s.count;

    const categoryMap = {};
    for (const c of byCategory) categoryMap[c._id] = c.count;

    const quantityMap = {};
    for (const q of quantityByCategory) quantityMap[q._id] = q.totalQuantity;

    res.json({
        total,
        pending: statusMap.pending || 0,
        matched: statusMap.matched || 0,
        accepted: statusMap.accepted || 0,
        scheduled: statusMap.scheduled || 0,
        collected: statusMap.collected || 0,
        processing: statusMap.processing || 0,
        completed: statusMap.completed || 0,
        cancelled: statusMap.cancelled || 0,
        byCategory: categoryMap,
        quantityByCategory: quantityMap,
    });
};

// @desc    Destination dashboard summary
// @route   GET /api/dashboard/destination
// @access  Private (destination)
const getDestinationDashboard = async (req, res) => {
    const userId = req.user._id;

    const [byStatus, recentCompleted] = await Promise.all([
        WasteListing.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        WasteListing.find({ assignedTo: userId, status: "completed" })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select("materialType quantity quantityUnit updatedAt")
            .lean(),
    ]);

    const statusMap = {};
    for (const s of byStatus) statusMap[s._id] = s.count;

    res.json({
        pending: statusMap.matched || 0,
        accepted: statusMap.accepted || 0,
        scheduled: statusMap.scheduled || 0,
        collected: statusMap.collected || 0,
        processing: statusMap.processing || 0,
        completed: statusMap.completed || 0,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        recentCompleted,
    });
};

// @desc    Admin platform dashboard
// @route   GET /api/dashboard/admin
// @access  Private (admin)
const getAdminDashboard = async (req, res) => {
    const [totalUsers, totalListings, totalDestinations, listingsByStatus, listingsByCategory] =
        await Promise.all([
            User.countDocuments(),
            WasteListing.countDocuments(),
            Destination.countDocuments(),
            WasteListing.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            WasteListing.aggregate([
                { $group: { _id: "$materialType", count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" } } },
            ]),
        ]);

    const statusMap = {};
    for (const s of listingsByStatus) statusMap[s._id] = s.count;

    const categoryMap = {};
    for (const c of listingsByCategory) categoryMap[c._id] = { count: c.count, totalQuantity: c.totalQuantity };

    res.json({
        totalUsers,
        totalListings,
        totalDestinations,
        verifiedDestinations: await Destination.countDocuments({ isVerified: true }),
        listingsByStatus: statusMap,
        listingsByCategory: categoryMap,
        completedCollections: statusMap.completed || 0,
    });
};

module.exports = { getUserDashboard, getDestinationDashboard, getAdminDashboard };
