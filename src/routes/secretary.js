const express = require("express");
const {
  exportTheses,
  importTheses,
  generateReport,
  getSystemHealth,
} = require("../controllers/secretaryController");
const { authenticateToken, requireSecretary } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication and secretary role
router.use(authenticateToken);
router.use(requireSecretary);

// Export thesis data
// Query params: format (json|csv), state, supervisor_id, year
router.get("/export/theses", exportTheses);

// Import thesis data from JSON
// Body: { theses: [...], dry_run: boolean }
router.post("/import/theses", importTheses);

// Generate comprehensive thesis report
// Query params: year, supervisor_id, state
router.get("/reports/comprehensive", generateReport);

// Get system health and statistics
router.get("/system/health", getSystemHealth);

module.exports = router;
