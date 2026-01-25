const express = require("express");
const {
  login,
  logout,
  getProfile,
  updateProfile,
  register,
} = require("../controllers/authController");
const { authenticateToken, requireSecretary } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// Public routes
router.post("/login", validate(schemas.login), login);
router.post("/logout", logout);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put(
  "/profile",
  authenticateToken,
  validate(schemas.updateProfile),
  updateProfile
);
router.post(
  "/register",
  authenticateToken,
  requireSecretary,
  validate(schemas.createUser),
  register
);

module.exports = router;
