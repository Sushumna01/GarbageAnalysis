const express = require("express");
const { protect } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");
const {
    createDestination,
    getMyDestination,
    updateDestination,
    getAllDestinations,
    getDestinationById,
    verifyDestination,
} = require("../controllers/destinationController");

const router = express.Router();

router.get("/", asyncHandler(getAllDestinations));
router.get("/me", protect, authorize("destination"), asyncHandler(getMyDestination));
router.put("/me", protect, authorize("destination"), asyncHandler(updateDestination));
router.get("/:id", asyncHandler(getDestinationById));

router.post("/", protect, authorize("destination"), asyncHandler(createDestination));
router.patch("/:id/verify", protect, authorize("admin"), asyncHandler(verifyDestination));

module.exports = router;
