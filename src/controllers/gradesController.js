const { query } = require("../config/database");

// Get grades for a thesis
const getThesisGrades = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { user } = req;

    // Check if user has access to this thesis
    const theses = await query(
      `
      SELECT 
        th.student_id,
        th.supervisor_id,
        th.state,
        t.creator_id as topic_creator_id
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      WHERE th.id = ?
    `,
      [thesis_id]
    );

    if (theses.length === 0) {
      return res.status(404).json({ error: "Thesis not found" });
    }

    const thesis = theses[0];

    // Check access permissions
    const hasAccess =
      user.role === "secretary" ||
      user.id === thesis.student_id ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id;

    if (!hasAccess) {
      // Check if user is a committee member
      const committeeMember = await query(
        "SELECT id FROM committee_members WHERE thesis_id = ? AND instructor_id = ?",
        [thesis_id, user.id]
      );

      if (committeeMember.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Get all grades for this thesis
    const grades = await query(
      `
      SELECT 
        g.id,
        g.grade_numeric,
        g.comments,
        g.created_at,
        u.id as grader_id,
        u.full_name as grader_name,
        u.email as grader_email,
        cm.role as committee_role
      FROM grades g
      JOIN users u ON g.grader_id = u.id
      LEFT JOIN committee_members cm ON cm.thesis_id = g.thesis_id AND cm.instructor_id = g.grader_id
      WHERE g.thesis_id = ?
      ORDER BY g.created_at DESC
    `,
      [thesis_id]
    );

    // Calculate statistics
    const stats = {
      total_grades: grades.length,
      average_grade:
        grades.length > 0
          ? grades.reduce(
              (sum, grade) => sum + parseFloat(grade.grade_numeric),
              0
            ) / grades.length
          : null,
      min_grade:
        grades.length > 0
          ? Math.min(...grades.map((g) => parseFloat(g.grade_numeric)))
          : null,
      max_grade:
        grades.length > 0
          ? Math.max(...grades.map((g) => parseFloat(g.grade_numeric)))
          : null,
    };

    res.json({
      grades,
      statistics: stats,
    });
  } catch (error) {
    console.error("Get thesis grades error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Submit grade for a thesis
const submitGrade = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { grade_numeric, comments } = req.body;
    const { user } = req;

    if (user.role !== "instructor") {
      return res
        .status(403)
        .json({ error: "Only instructors can submit grades" });
    }

    // Check if thesis exists and get details
    const theses = await query(
      `
      SELECT 
        th.id,
        th.state,
        th.supervisor_id
      FROM theses th
      WHERE th.id = ?
    `,
      [thesis_id]
    );

    if (theses.length === 0) {
      return res.status(404).json({ error: "Thesis not found" });
    }

    const thesis = theses[0];

    // Check if thesis is in a gradeable state
    if (!["UNDER_REVIEW", "COMPLETED"].includes(thesis.state)) {
      return res.status(400).json({
        error: "Can only grade theses that are under review or completed",
      });
    }

    // Check if instructor is authorized to grade (must be committee member)
    const committeeMember = await query(
      "SELECT id, role FROM committee_members WHERE thesis_id = ? AND instructor_id = ? AND accepted_at IS NOT NULL",
      [thesis_id, user.id]
    );

    if (committeeMember.length === 0) {
      return res.status(403).json({
        error: "Only committee members can grade this thesis",
      });
    }

    // Check if instructor has already graded this thesis
    const existingGrade = await query(
      "SELECT id FROM grades WHERE thesis_id = ? AND grader_id = ?",
      [thesis_id, user.id]
    );

    if (existingGrade.length > 0) {
      return res.status(409).json({
        error: "You have already submitted a grade for this thesis",
      });
    }

    // Validate grade range (0-10)
    if (grade_numeric < 0 || grade_numeric > 10) {
      return res.status(400).json({
        error: "Grade must be between 0 and 10",
      });
    }

    // Submit grade
    const result = await query(
      `INSERT INTO grades (thesis_id, grader_id, grade_numeric, comments) 
       VALUES (?, ?, ?, ?)`,
      [thesis_id, user.id, grade_numeric, comments || null]
    );

    res.status(201).json({
      message: "Grade submitted successfully",
      gradeId: result.insertId,
    });
  } catch (error) {
    console.error("Submit grade error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update grade (only by the grader who submitted it)
const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade_numeric, comments } = req.body;
    const { user } = req;

    if (user.role !== "instructor") {
      return res
        .status(403)
        .json({ error: "Only instructors can update grades" });
    }

    // Get grade details
    const grades = await query(
      `
      SELECT 
        g.id,
        g.thesis_id,
        g.grader_id,
        th.state
      FROM grades g
      JOIN theses th ON g.thesis_id = th.id
      WHERE g.id = ?
    `,
      [id]
    );

    if (grades.length === 0) {
      return res.status(404).json({ error: "Grade not found" });
    }

    const grade = grades[0];

    // Check if user is the one who submitted this grade
    if (grade.grader_id !== user.id && user.role !== "secretary") {
      return res.status(403).json({
        error: "You can only update grades you submitted",
      });
    }

    // Check if thesis is still in updatable state
    if (grade.state === "COMPLETED" && user.role !== "secretary") {
      return res.status(400).json({
        error: "Cannot update grades for completed theses",
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (grade_numeric !== undefined) {
      if (grade_numeric < 0 || grade_numeric > 10) {
        return res.status(400).json({
          error: "Grade must be between 0 and 10",
        });
      }
      updates.push("grade_numeric = ?");
      params.push(grade_numeric);
    }

    if (comments !== undefined) {
      updates.push("comments = ?");
      params.push(comments);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    await query(`UPDATE grades SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ message: "Grade updated successfully" });
  } catch (error) {
    console.error("Update grade error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete grade (only by the grader who submitted it)
const deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (user.role !== "instructor" && user.role !== "secretary") {
      return res
        .status(403)
        .json({ error: "Only instructors can delete grades" });
    }

    // Get grade details
    const grades = await query(
      `
      SELECT 
        g.id,
        g.thesis_id,
        g.grader_id,
        th.state
      FROM grades g
      JOIN theses th ON g.thesis_id = th.id
      WHERE g.id = ?
    `,
      [id]
    );

    if (grades.length === 0) {
      return res.status(404).json({ error: "Grade not found" });
    }

    const grade = grades[0];

    // Check permissions
    if (grade.grader_id !== user.id && user.role !== "secretary") {
      return res.status(403).json({
        error: "You can only delete grades you submitted",
      });
    }

    // Check if thesis is still in deletable state
    if (grade.state === "COMPLETED" && user.role !== "secretary") {
      return res.status(400).json({
        error: "Cannot delete grades for completed theses",
      });
    }

    await query("DELETE FROM grades WHERE id = ?", [id]);

    res.json({ message: "Grade deleted successfully" });
  } catch (error) {
    console.error("Delete grade error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get grading summary for instructor
const getInstructorGradingSummary = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "instructor") {
      return res
        .status(403)
        .json({ error: "Only instructors can access grading summary" });
    }

    // Get theses waiting for grading by this instructor
    const pendingGrading = await query(
      `
      SELECT 
        th.id as thesis_id,
        t.title as topic_title,
        s.full_name as student_name,
        s.am as student_am,
        th.state,
        cm.role as committee_role,
        CASE 
          WHEN g.id IS NOT NULL THEN true 
          ELSE false 
        END as already_graded
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN committee_members cm ON cm.thesis_id = th.id AND cm.instructor_id = ?
      LEFT JOIN grades g ON g.thesis_id = th.id AND g.grader_id = ?
      WHERE th.state IN ('UNDER_REVIEW', 'COMPLETED')
      AND cm.accepted_at IS NOT NULL
      ORDER BY th.state, t.title
    `,
      [user.id, user.id]
    );

    // Get grading statistics for this instructor
    const gradingStats = await query(
      `
      SELECT 
        COUNT(*) as total_grades_given,
        AVG(grade_numeric) as average_grade_given,
        MIN(grade_numeric) as min_grade_given,
        MAX(grade_numeric) as max_grade_given
      FROM grades g
      WHERE g.grader_id = ?
    `,
      [user.id]
    );

    // Get recent grading activity
    const recentGrades = await query(
      `
      SELECT 
        g.id,
        g.grade_numeric,
        g.created_at,
        t.title as topic_title,
        s.full_name as student_name
      FROM grades g
      JOIN theses th ON g.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      WHERE g.grader_id = ?
      ORDER BY g.created_at DESC
      LIMIT 10
    `,
      [user.id]
    );

    res.json({
      pending_grading: pendingGrading,
      statistics: gradingStats[0],
      recent_grades: recentGrades,
    });
  } catch (error) {
    console.error("Get instructor grading summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get overall grading statistics (for secretary)
const getGradingStatistics = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "secretary") {
      return res
        .status(403)
        .json({ error: "Only secretary can access overall statistics" });
    }

    // Overall statistics
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_grades,
        AVG(grade_numeric) as average_grade,
        MIN(grade_numeric) as min_grade,
        MAX(grade_numeric) as max_grade,
        COUNT(DISTINCT thesis_id) as graded_theses,
        COUNT(DISTINCT grader_id) as active_graders
      FROM grades
    `);

    // Grade distribution
    const gradeDistribution = await query(`
      SELECT 
        FLOOR(grade_numeric) as grade_range,
        COUNT(*) as count
      FROM grades
      GROUP BY FLOOR(grade_numeric)
      ORDER BY grade_range
    `);

    // Top graders (most active)
    const topGraders = await query(`
      SELECT 
        u.full_name as grader_name,
        COUNT(*) as grades_given,
        AVG(g.grade_numeric) as average_grade
      FROM grades g
      JOIN users u ON g.grader_id = u.id
      GROUP BY g.grader_id, u.full_name
      ORDER BY grades_given DESC
      LIMIT 10
    `);

    // Recent grading activity
    const recentActivity = await query(`
      SELECT 
        g.grade_numeric,
        g.created_at,
        u.full_name as grader_name,
        t.title as topic_title,
        s.full_name as student_name
      FROM grades g
      JOIN users u ON g.grader_id = u.id
      JOIN theses th ON g.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      ORDER BY g.created_at DESC
      LIMIT 20
    `);

    res.json({
      overall_statistics: overallStats[0],
      grade_distribution: gradeDistribution,
      top_graders: topGraders,
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error("Get grading statistics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getThesisGrades,
  submitGrade,
  updateGrade,
  deleteGrade,
  getInstructorGradingSummary,
  getGradingStatistics,
};
