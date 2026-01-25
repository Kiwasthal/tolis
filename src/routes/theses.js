const express = require("express");
const {
  getTheses,
  getThesis,
  createThesis,
  updateThesisState,
  getThesisStats,
} = require("../controllers/thesesController");
const {
  authenticateToken,
  requireInstructorOrSecretary,
} = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get thesis statistics (instructors and secretary only)
router.get("/stats", requireInstructorOrSecretary, getThesisStats);

// List theses (filtered by user role)
router.get("/", getTheses);

// Get specific thesis
router.get("/:id", getThesis);

// Create new thesis assignment (instructors and secretary only)
router.post(
  "/",
  requireInstructorOrSecretary,
  validate(schemas.createThesis),
  createThesis
);

// Update thesis state
router.put(
  "/:id/state",
  validate(schemas.updateThesisState),
  updateThesisState
);

module.exports = router;
