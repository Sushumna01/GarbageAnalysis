const express = require("express");
const categories = require("../config/categories");

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        categories: Object.entries(categories).map(([key, value]) => ({
            key,
            label: value.label,
            guidance: value.guidance,
        })),
    });
});

module.exports = router;
