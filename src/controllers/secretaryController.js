const { query } = require("../config/database");

// Export thesis data as JSON
const exportTheses = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "secretary") {
      return res.status(403).json({ error: "Only secretary can export data" });
    }

    // Simple thesis data export
    const theses = await query(`
      SELECT 
        th.id,
        th.state,
        th.assigned_at,
        th.started_at,
        th.finalized_at,
        t.title as topic_title,
        t.summary as topic_summary,
        student.full_name as student_name,
        student.email as student_email,
        student.am as student_am,
        supervisor.full_name as supervisor_name,
        supervisor.email as supervisor_email
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      JOIN users student ON th.student_id = student.id
      JOIN users supervisor ON th.supervisor_id = supervisor.id
      ORDER BY th.assigned_at DESC
    `);

    res.json({
      export_date: new Date().toISOString(),
      total_theses: theses.length,
      data: theses,
    });
  } catch (error) {
    console.error("Export theses error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Generate comprehensive thesis report
const generateReport = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "secretary") {
      return res
        .status(403)
        .json({ error: "Only secretary can generate reports" });
    }

    // Overall statistics
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_theses,
        COUNT(CASE WHEN state = 'UNDER_ASSIGNMENT' THEN 1 END) as under_assignment_count,
        COUNT(CASE WHEN state = 'ACTIVE' THEN 1 END) as active_count,
        COUNT(CASE WHEN state = 'UNDER_REVIEW' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN state = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN state = 'CANCELLED' THEN 1 END) as cancelled_count
      FROM theses
    `);

    // Supervisor statistics
    const supervisorStats = await query(`
      SELECT 
        u.full_name as supervisor_name,
        u.email as supervisor_email,
        COUNT(*) as total_supervised,
        COUNT(CASE WHEN th.state = 'COMPLETED' THEN 1 END) as completed_supervised
      FROM theses th
      JOIN users u ON th.supervisor_id = u.id
      GROUP BY th.supervisor_id, u.full_name, u.email
      ORDER BY total_supervised DESC
    `);

    // Grading statistics
    const gradingStats = await query(`
      SELECT 
        COUNT(DISTINCT g.thesis_id) as graded_theses,
        COUNT(*) as total_grades,
        AVG(g.grade_numeric) as average_grade,
        MIN(g.grade_numeric) as min_grade,
        MAX(g.grade_numeric) as max_grade
      FROM grades g
      JOIN theses th ON g.thesis_id = th.id
    `);

    res.json({
      report_generated: new Date().toISOString(),
      overall_statistics: overallStats[0],
      supervisor_statistics: supervisorStats,
      grading_statistics: gradingStats[0],
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get system health and statistics
const getSystemHealth = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "secretary") {
      return res
        .status(403)
        .json({ error: "Only secretary can access system health" });
    }

    // Database health checks
    const userCounts = await query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
    `);

    const thesisCounts = await query(`
      SELECT 
        state,
        COUNT(*) as count
      FROM theses 
      GROUP BY state
    `);

    const topicCounts = await query(`
      SELECT 
        COUNT(*) as total_topics
      FROM topics
    `);

    res.json({
      health_check_time: new Date().toISOString(),
      user_statistics: userCounts,
      thesis_statistics: thesisCounts,
      topic_statistics: topicCounts,
      system_status: "healthy",
    });
  } catch (error) {
    console.error("System health error:", error);
    res.status(500).json({
      error: "Internal server error",
      system_status: "unhealthy",
      health_check_time: new Date().toISOString(),
    });
  }
};

// Simple import (basic version)
const importTheses = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "secretary") {
      return res.status(403).json({ error: "Only secretary can import data" });
    }

    res.json({
      message: "Import functionality available but simplified for demo",
      note: "Full import implementation would require careful validation",
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  exportTheses,
  importTheses,
  generateReport,
  getSystemHealth,
};
