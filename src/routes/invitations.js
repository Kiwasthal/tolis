const express = require("express");
const {
  getInvitations,
  createInvitation,
  respondToInvitation,
  getThesisCommittee,
  getAvailableInstructors,
} = require("../controllers/invitationsController");
const { authenticateToken } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get invitations for logged-in instructor
router.get("/", getInvitations);

// Respond to invitation (accept/reject)
router.post(
  "/:id/respond",
  validate(schemas.respondToInvitation),
  respondToInvitation
);

// Thesis-specific committee routes
router.get("/theses/:thesis_id/committee", getThesisCommittee);
router.get("/theses/:thesis_id/available-instructors", getAvailableInstructors);
router.post(
  "/theses/:thesis_id/invite",
  validate(schemas.createInvitation),
  createInvitation
);

module.exports = router;
