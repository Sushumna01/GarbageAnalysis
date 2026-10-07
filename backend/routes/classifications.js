const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const {
    classifyImage,
    getHistory,
    getSummary,
    deleteClassification,
} = require("../controllers/classificationController");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Number(process.env.MAX_IMAGE_SIZE_BYTES) || 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
            return callback(new Error("Only JPEG, PNG, WebP, and GIF images are supported"));
        }
        return callback(null, true);
    },
});

router.use(protect);
router.post("/", upload.single("image"), asyncHandler(classifyImage));
router.get("/", asyncHandler(getHistory));
router.get("/summary", asyncHandler(getSummary));
router.delete("/:id", asyncHandler(deleteClassification));

module.exports = router;
