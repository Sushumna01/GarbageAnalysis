const express = require("express");
const { protect } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");
const {
    acceptRequest,
    rejectRequest,
    scheduleCollection,
    markCollected,
    markProcessing,
    markCompleted,
    getDestinationRequests,
} = require("../controllers/collectionController");

const router = express.Router();

router.use(protect);
router.use(authorize("destination", "admin"));

router.get("/", asyncHandler(getDestinationRequests));
router.patch("/:id/accept", asyncHandler(acceptRequest));
router.patch("/:id/reject", asyncHandler(rejectRequest));
router.patch("/:id/schedule", asyncHandler(scheduleCollection));
router.patch("/:id/collect", asyncHandler(markCollected));
router.patch("/:id/process", asyncHandler(markProcessing));
router.patch("/:id/complete", asyncHandler(markCompleted));

module.exports = router;
