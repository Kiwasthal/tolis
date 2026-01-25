const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details from database
    const users = await query(
      "SELECT id, role, am, full_name, email FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid token - user not found" });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Middleware to check user roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

// Middleware to check if user is instructor
const requireInstructor = requireRole("instructor");

// Middleware to check if user is student
const requireStudent = requireRole("student");

// Middleware to check if user is secretary
const requireSecretary = requireRole("secretary");

// Middleware to check if user is instructor or secretary
const requireInstructorOrSecretary = requireRole("instructor", "secretary");

// Middleware to check if user owns resource or has elevated privileges
const requireOwnershipOrElevated = async (req, res, next) => {
  const { user } = req;
  const resourceUserId = req.params.userId || req.body.userId;

  // Admin roles can access any resource
  if (user.role === "secretary" || user.role === "instructor") {
    return next();
  }

  // Users can only access their own resources
  if (user.id == resourceUserId) {
    return next();
  }

  return res
    .status(403)
    .json({ error: "Access denied - insufficient permissions" });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireInstructor,
  requireStudent,
  requireSecretary,
  requireInstructorOrSecretary,
  requireOwnershipOrElevated,
};
