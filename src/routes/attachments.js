const express = require("express");
const {
  upload,
  getAttachments,
  uploadAttachments,
  downloadAttachment,
  deleteAttachment,
  updateAttachment,
} = require("../controllers/attachmentsController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get attachments for a thesis
router.get("/theses/:thesis_id", getAttachments);

// Upload attachments to a thesis (with file upload middleware)
router.post(
  "/theses/:thesis_id/upload",
  upload.array("files", 5), // Allow up to 5 files with field name 'files'
  uploadAttachments
);

// Download specific attachment
router.get("/:id/download", downloadAttachment);

// Update attachment metadata
router.put("/:id", updateAttachment);

// Delete attachment
router.delete("/:id", deleteAttachment);

module.exports = router;
