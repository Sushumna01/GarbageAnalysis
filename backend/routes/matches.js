const express = require("express");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { findMatches, assignMatch } = require("../controllers/matchController");

const router = express.Router();

router.use(protect);

router.get("/:wasteId", asyncHandler(findMatches));
router.post("/:wasteId/assign", asyncHandler(assignMatch));

module.exports = router;
