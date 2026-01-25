const express = require("express");
const {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
} = require("../controllers/topicsController");
const { authenticateToken, requireInstructor } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// Public/protected routes (all authenticated users can view topics)
router.get("/", authenticateToken, getTopics);
router.get("/:id", authenticateToken, getTopic);

// Instructor-only routes
router.post(
  "/",
  authenticateToken,
  requireInstructor,
  validate(schemas.createTopic),
  createTopic
);
router.put(
  "/:id",
  authenticateToken,
  requireInstructor,
  validate(schemas.updateTopic),
  updateTopic
);
router.delete("/:id", authenticateToken, requireInstructor, deleteTopic);

module.exports = router;
