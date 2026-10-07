const express = require("express");
const { protect } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");
const {
    createWasteListing,
    getMyWasteListings,
    getWasteListingById,
    updateWasteListing,
    deleteWasteListing,
    cancelWasteListing,
} = require("../controllers/wasteController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("user", "admin"), asyncHandler(createWasteListing));
router.get("/", asyncHandler(getMyWasteListings));
router.get("/:id", asyncHandler(getWasteListingById));
router.put("/:id", authorize("user", "admin"), asyncHandler(updateWasteListing));
router.delete("/:id", authorize("user", "admin"), asyncHandler(deleteWasteListing));
router.patch("/:id/cancel", authorize("user", "admin"), asyncHandler(cancelWasteListing));

module.exports = router;
