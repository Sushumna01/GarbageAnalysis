const express = require("express");
const router = express.Router();
const { register, login, getCurrentUser } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);
router.get("/me", protect, getCurrentUser);

module.exports = router;
