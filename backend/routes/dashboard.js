const express = require("express");
const { protect } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");
const {
    getUserDashboard,
    getDestinationDashboard,
    getAdminDashboard,
} = require("../controllers/dashboardController");

const router = express.Router();

router.use(protect);

router.get("/user", asyncHandler(getUserDashboard));
router.get("/destination", authorize("destination", "admin"), asyncHandler(getDestinationDashboard));
router.get("/admin", authorize("admin"), asyncHandler(getAdminDashboard));

module.exports = router;
