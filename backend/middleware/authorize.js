/**
 * Role-based authorization middleware.
 * Must be used AFTER the `protect` middleware so that req.user is available.
 *
 * Usage:  router.post("/admin-only", protect, authorize("admin"), handler);
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action",
            });
        }
        next();
    };
};

module.exports = authorize;
