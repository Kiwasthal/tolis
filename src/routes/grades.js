const express = require("express");
const {
  getThesisGrades,
  submitGrade,
  updateGrade,
  deleteGrade,
  getInstructorGradingSummary,
  getGradingStatistics,
} = require("../controllers/gradesController");
const {
  authenticateToken,
  requireInstructor,
  requireSecretary,
} = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get instructor grading summary
router.get(
  "/instructor/summary",
  requireInstructor,
  getInstructorGradingSummary
);

// Get overall grading statistics (secretary only)
router.get("/statistics", requireSecretary, getGradingStatistics);

// Get grades for a specific thesis
router.get("/theses/:thesis_id", getThesisGrades);

// Submit grade for a thesis
router.post(
  "/theses/:thesis_id",
  requireInstructor,
  validate(schemas.createGrade),
  submitGrade
);

// Update specific grade
router.put(
  "/:id",
  requireInstructor,
  validate(schemas.createGrade),
  updateGrade
);

// Delete specific grade
router.delete("/:id", deleteGrade);

module.exports = router;
