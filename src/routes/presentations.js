const express = require("express");
const {
  getPresentations,
  getPublicPresentations,
  getPresentation,
  createPresentation,
  updatePresentation,
  deletePresentation,
} = require("../controllers/presentationsController");
const { authenticateToken } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// Public routes (no authentication required)
router.get("/public", getPublicPresentations);

// Protected routes (require authentication)
router.use(authenticateToken);

// List presentations (filtered by user access)
router.get("/", getPresentations);

// Get specific presentation
router.get("/:id", getPresentation);

// Create presentation for a thesis
router.post(
  "/theses/:thesis_id",
  validate(schemas.createPresentation),
  createPresentation
);

// Update presentation
router.put("/:id", validate(schemas.createPresentation), updatePresentation);

// Delete presentation
router.delete("/:id", deletePresentation);

module.exports = router;
