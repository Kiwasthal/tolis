const { query } = require("../config/database");

// Get all theses (filtered by user role)
const getTheses = async (req, res) => {
  try {
    const { user } = req;
    const { status, student_id, supervisor_id } = req.query;

    let sql = `
      SELECT 
        th.id,
        th.topic_id,
        th.student_id,
        th.supervisor_id,
        th.state,
        th.assigned_at,
        th.started_at,
        th.finalized_at,
        th.cancellation_reason,
        th.ap_number,
        th.created_at,
        t.title as topic_title,
        t.summary as topic_summary,
        s.full_name as student_name,
        s.am as student_am,
        s.email as student_email,
        sup.full_name as supervisor_name,
        sup.email as supervisor_email
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE 1=1
    `;

    const params = [];

    // Filter based on user role
    if (user.role === "student") {
      sql += " AND th.student_id = ?";
      params.push(user.id);
    } else if (user.role === "instructor") {
      sql +=
        " AND (th.supervisor_id = ? OR EXISTS (SELECT 1 FROM committee_members cm WHERE cm.thesis_id = th.id AND cm.instructor_id = ?))";
      params.push(user.id, user.id);
    }
    // Secretary can see all theses

    // Additional filters
    if (status) {
      sql += " AND th.state = ?";
      params.push(status);
    }

    if (student_id && user.role !== "student") {
      sql += " AND th.student_id = ?";
      params.push(student_id);
    }

    if (
      supervisor_id &&
      (user.role === "secretary" || user.id == supervisor_id)
    ) {
      sql += " AND th.supervisor_id = ?";
      params.push(supervisor_id);
    }

    sql += " ORDER BY th.created_at DESC";

    const theses = await query(sql, params);
    res.json({ theses });
  } catch (error) {
    console.error("Get theses error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get single thesis with full details
const getThesis = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get thesis details
    const theses = await query(
      `
      SELECT 
        th.id,
        th.topic_id,
        th.student_id,
        th.supervisor_id,
        th.state,
        th.assigned_at,
        th.started_at,
        th.finalized_at,
        th.cancellation_reason,
        th.ap_number,
        th.created_at,
        t.title as topic_title,
        t.summary as topic_summary,
        t.description_pdf as topic_description_pdf,
        t.creator_id as topic_creator_id,
        s.full_name as student_name,
        s.am as student_am,
        s.email as student_email,
        s.phone as student_phone,
        sup.full_name as supervisor_name,
        sup.email as supervisor_email
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE th.id = ?
    `,
      [id]
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
        [id, user.id]
      );

      if (committeeMember.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Get committee members
    const committee = await query(
      `
      SELECT 
        cm.id,
        cm.role as committee_role,
        cm.invited_at,
        cm.accepted_at,
        cm.rejected_at,
        u.id as instructor_id,
        u.full_name as instructor_name,
        u.email as instructor_email
      FROM committee_members cm
      JOIN users u ON cm.instructor_id = u.id
      WHERE cm.thesis_id = ?
      ORDER BY cm.invited_at DESC
    `,
      [id]
    );

    // Get attachments
    const attachments = await query(
      `
      SELECT 
        a.id,
        a.filename,
        a.file_url,
        a.mime,
        a.is_draft,
        a.uploaded_at,
        u.full_name as uploaded_by_name
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.thesis_id = ?
      ORDER BY a.uploaded_at DESC
    `,
      [id]
    );

    // Get presentations
    const presentations = await query(
      `
      SELECT 
        p.id,
        p.scheduled_at,
        p.mode,
        p.room,
        p.online_link,
        p.created_at,
        u.full_name as created_by_name
      FROM presentations p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.thesis_id = ?
      ORDER BY p.scheduled_at DESC
    `,
      [id]
    );

    res.json({
      thesis: {
        ...thesis,
        committee,
        attachments,
        presentations,
      },
    });
  } catch (error) {
    console.error("Get thesis error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new thesis assignment
const createThesis = async (req, res) => {
  try {
    const { topic_id, student_id, supervisor_id } = req.body;
    const { user } = req;

    // Only instructors and secretary can create thesis assignments
    if (!student_id || !supervisor_id) {
      return res.status(400).json({
        error: "student_id and supervisor_id are required",
      });
    }

    // Verify topic exists
    const topics = await query(
      "SELECT id, creator_id FROM topics WHERE id = ?",
      [topic_id]
    );
    if (topics.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Verify student exists and is actually a student
    const students = await query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'student'",
      [student_id]
    );
    if (students.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Verify supervisor exists and is an instructor
    const supervisors = await query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'instructor'",
      [supervisor_id]
    );
    if (supervisors.length === 0) {
      return res
        .status(404)
        .json({ error: "Supervisor must be an instructor" });
    }

    // Check if student already has an active thesis
    const existingTheses = await query(
      "SELECT id FROM theses WHERE student_id = ? AND state NOT IN ('COMPLETED', 'CANCELLED')",
      [student_id]
    );
    if (existingTheses.length > 0) {
      return res
        .status(409)
        .json({ error: "Student already has an active thesis assignment" });
    }

    // Check if topic is already assigned
    const topicAssignments = await query(
      "SELECT id FROM theses WHERE topic_id = ? AND state NOT IN ('COMPLETED', 'CANCELLED')",
      [topic_id]
    );
    if (topicAssignments.length > 0) {
      return res
        .status(409)
        .json({ error: "Topic is already assigned to another student" });
    }

    // Create thesis assignment
    const result = await query(
      `INSERT INTO theses (topic_id, student_id, supervisor_id, state, assigned_at) 
       VALUES (?, ?, ?, 'UNDER_ASSIGNMENT', NOW())`,
      [topic_id, student_id, supervisor_id]
    );

    // Add supervisor to committee
    await query(
      `INSERT INTO committee_members (thesis_id, instructor_id, role, invited_at, accepted_at) 
       VALUES (?, ?, 'supervisor', NOW(), NOW())`,
      [result.insertId, supervisor_id]
    );

    res.status(201).json({
      message: "Thesis assignment created successfully",
      thesisId: result.insertId,
    });
  } catch (error) {
    console.error("Create thesis error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update thesis state
const updateThesisState = async (req, res) => {
  try {
    const { id } = req.params;
    const { state, cancellation_reason, ap_number } = req.body;
    const { user } = req;

    // Get current thesis
    const theses = await query(
      "SELECT student_id, supervisor_id, state, topic_id FROM theses WHERE id = ?",
      [id]
    );

    if (theses.length === 0) {
      return res.status(404).json({ error: "Thesis not found" });
    }

    const thesis = theses[0];

    // Check permissions
    const canUpdate =
      user.role === "secretary" ||
      user.id === thesis.supervisor_id ||
      (user.id === thesis.student_id &&
        ["UNDER_ASSIGNMENT", "ACTIVE"].includes(thesis.state));

    if (!canUpdate) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate state transitions
    const validTransitions = {
      UNDER_ASSIGNMENT: ["ACTIVE", "CANCELLED"],
      ACTIVE: ["UNDER_REVIEW", "CANCELLED"],
      UNDER_REVIEW: ["COMPLETED", "ACTIVE", "CANCELLED"],
      COMPLETED: [], // Final state
      CANCELLED: ["UNDER_ASSIGNMENT"], // Can be reactivated by secretary
    };

    if (!validTransitions[thesis.state].includes(state)) {
      return res.status(400).json({
        error: `Invalid state transition from ${thesis.state} to ${state}`,
      });
    }

    // Build update query
    const updates = ["state = ?"];
    const params = [state];

    if (state === "ACTIVE" && thesis.state === "UNDER_ASSIGNMENT") {
      updates.push("started_at = NOW()");
    }

    if (state === "COMPLETED") {
      updates.push("finalized_at = NOW()");
      if (ap_number) {
        updates.push("ap_number = ?");
        params.push(ap_number);
      }
    }

    if (state === "CANCELLED") {
      if (!cancellation_reason) {
        return res
          .status(400)
          .json({ error: "Cancellation reason is required" });
      }
      updates.push("cancellation_reason = ?");
      params.push(cancellation_reason);
    }

    params.push(id);

    await query(`UPDATE theses SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ message: "Thesis state updated successfully" });
  } catch (error) {
    console.error("Update thesis state error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get thesis statistics (for instructors and secretary)
const getThesisStats = async (req, res) => {
  try {
    const { user } = req;

    if (user.role === "student") {
      return res.status(403).json({ error: "Access denied" });
    }

    let whereClause = "";
    const params = [];

    if (user.role === "instructor") {
      whereClause = "WHERE supervisor_id = ?";
      params.push(user.id);
    }

    const stats = await query(
      `
      SELECT 
        state,
        COUNT(*) as count,
        AVG(CASE 
          WHEN finalized_at IS NOT NULL AND started_at IS NOT NULL 
          THEN DATEDIFF(finalized_at, started_at) 
          ELSE NULL 
        END) as avg_days_to_completion
      FROM theses 
      ${whereClause}
      GROUP BY state
    `,
      params
    );

    const recentActivity = await query(
      `
      SELECT 
        th.id,
        th.state,
        th.created_at,
        t.title as topic_title,
        s.full_name as student_name
      FROM theses th
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      ${whereClause}
      ORDER BY th.created_at DESC
      LIMIT 10
    `,
      params
    );

    res.json({
      stats,
      recentActivity,
    });
  } catch (error) {
    console.error("Get thesis stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getTheses,
  getThesis,
  createThesis,
  updateThesisState,
  getThesisStats,
};
