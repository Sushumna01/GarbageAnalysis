const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Build safe user response object (never return password)
const userResponse = (user, token) => {
    const data = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    if (token) data.token = token;
    return data;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body || {};
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedName = typeof name === "string" ? name.trim() : "";

        // Validate input
        if (!normalizedName || !normalizedEmail || typeof password !== "string") {
            return res.status(400).json({ message: "Please fill in all fields" });
        }
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }
        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({ message: "Password must be between 8 and 128 characters" });
        }

        // Public registration may create standard or destination accounts, never admins.
        if (role !== undefined && !["user", "destination"].includes(role)) {
            return res.status(400).json({ message: "Role must be user or destination" });
        }
        const userRole = role || "user";

        // Check if user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user
        const createData = { name: normalizedName, email: normalizedEmail, password, role: userRole };
        if (phone && typeof phone === "string") createData.phone = phone.trim();

        const user = await User.create(createData);

        res.status(201).json(userResponse(user, generateToken(user._id)));
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        // Validate input
        if (!normalizedEmail || typeof password !== "string") {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await user.matchPassword(password))) {
            res.json(userResponse(user, generateToken(user._id)));
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = (req, res) => {
    res.json(userResponse(req.user));
};

module.exports = { register, login, getCurrentUser };
