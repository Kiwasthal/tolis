const { query } = require("../config/database");

// Get presentations (with optional filtering)
const getPresentations = async (req, res) => {
  try {
    const { user } = req;
    const { from, to, format, thesis_id } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.thesis_id,
        p.scheduled_at,
        p.mode,
        p.room,
        p.online_link,
        p.created_at,
        p.created_by,
        cb.full_name as created_by_name,
        th.state as thesis_state,
        t.title as topic_title,
        t.summary as topic_summary,
        s.full_name as student_name,
        s.am as student_am,
        sup.full_name as supervisor_name
      FROM presentations p
      LEFT JOIN users cb ON p.created_by = cb.id
      JOIN theses th ON p.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE 1=1
    `;

    const params = [];

    // Apply access filters based on user role
    if (user.role === "student") {
      sql += " AND th.student_id = ?";
      params.push(user.id);
    } else if (user.role === "instructor") {
      sql +=
        " AND (th.supervisor_id = ? OR EXISTS (SELECT 1 FROM committee_members cm WHERE cm.thesis_id = th.id AND cm.instructor_id = ?))";
      params.push(user.id, user.id);
    }
    // Secretary can see all presentations

    // Date range filtering
    if (from) {
      sql += " AND p.scheduled_at >= ?";
      params.push(from);
    }

    if (to) {
      sql += " AND p.scheduled_at <= ?";
      params.push(to);
    }

    // Specific thesis filtering
    if (thesis_id) {
      sql += " AND p.thesis_id = ?";
      params.push(thesis_id);
    }

    sql += " ORDER BY p.scheduled_at ASC";

    const presentations = await query(sql, params);

    // Handle different response formats
    if (format === "xml") {
      return res
        .set("Content-Type", "application/xml")
        .send(generateXML(presentations));
    }

    res.json({ presentations });
  } catch (error) {
    console.error("Get presentations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get public presentations feed (no authentication required)
const getPublicPresentations = async (req, res) => {
  try {
    const { from, to, format } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.scheduled_at,
        p.mode,
        p.room,
        t.title as topic_title,
        t.summary as topic_summary,
        s.full_name as student_name,
        s.am as student_am,
        sup.full_name as supervisor_name
      FROM presentations p
      JOIN theses th ON p.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE th.state IN ('UNDER_REVIEW', 'COMPLETED')
    `;

    const params = [];

    // Date range filtering
    if (from) {
      sql += " AND p.scheduled_at >= ?";
      params.push(from);
    }

    if (to) {
      sql += " AND p.scheduled_at <= ?";
      params.push(to);
    }

    sql += " ORDER BY p.scheduled_at ASC";

    const presentations = await query(sql, params);

    // Handle different response formats
    if (format === "xml") {
      return res
        .set("Content-Type", "application/xml")
        .send(generateXML(presentations));
    }

    res.json({ presentations });
  } catch (error) {
    console.error("Get public presentations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get specific presentation
const getPresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const presentations = await query(
      `
      SELECT 
        p.id,
        p.thesis_id,
        p.scheduled_at,
        p.mode,
        p.room,
        p.online_link,
        p.created_at,
        p.created_by,
        cb.full_name as created_by_name,
        th.state as thesis_state,
        th.student_id,
        th.supervisor_id,
        t.title as topic_title,
        t.summary as topic_summary,
        t.creator_id as topic_creator_id,
        s.full_name as student_name,
        s.am as student_am,
        s.email as student_email,
        sup.full_name as supervisor_name,
        sup.email as supervisor_email
      FROM presentations p
      LEFT JOIN users cb ON p.created_by = cb.id
      JOIN theses th ON p.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (presentations.length === 0) {
      return res.status(404).json({ error: "Presentation not found" });
    }

    const presentation = presentations[0];

    // Check access permissions
    const hasAccess =
      user.role === "secretary" ||
      user.id === presentation.student_id ||
      user.id === presentation.supervisor_id ||
      user.id === presentation.topic_creator_id;

    if (!hasAccess) {
      // Check if user is a committee member
      const committeeMember = await query(
        "SELECT id FROM committee_members WHERE thesis_id = ? AND instructor_id = ?",
        [presentation.thesis_id, user.id]
      );

      if (committeeMember.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Get committee members for this presentation
    const committee = await query(
      `
      SELECT 
        cm.id,
        cm.role as committee_role,
        u.id as instructor_id,
        u.full_name as instructor_name,
        u.email as instructor_email
      FROM committee_members cm
      JOIN users u ON cm.instructor_id = u.id
      WHERE cm.thesis_id = ? AND cm.accepted_at IS NOT NULL
      ORDER BY cm.role DESC, u.full_name
    `,
      [presentation.thesis_id]
    );

    res.json({
      presentation: {
        ...presentation,
        committee,
      },
    });
  } catch (error) {
    console.error("Get presentation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create presentation
const createPresentation = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { scheduled_at, mode, room, online_link } = req.body;
    const { user } = req;

    // Debug logging removed - presentation creation working correctly

    // Validate required fields
    if (!scheduled_at) {
      return res.status(400).json({ error: "scheduled_at is required" });
    }
    if (!mode) {
      return res.status(400).json({ error: "mode is required" });
    }

    // Get thesis details and check permissions
    const theses = await query(
      `
      SELECT 
        th.id,
        th.supervisor_id,
        th.student_id,
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

    // Check permissions - supervisor, topic creator, student, or secretary can schedule
    const canSchedule =
      user.role === "secretary" ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id ||
      user.id === thesis.student_id; // Allow students to schedule their own presentations

    if (!canSchedule) {
      return res
        .status(403)
        .json({ error: "Access denied - insufficient permissions" });
    }

    // Check thesis state - should be UNDER_REVIEW or ACTIVE for scheduling
    if (!["ACTIVE", "UNDER_REVIEW"].includes(thesis.state)) {
      return res.status(400).json({
        error:
          "Can only schedule presentations for active or under-review theses",
      });
    }

    // Normalize mode values
    const normalizedMode = mode?.toUpperCase().replace("-", "_");

    // Validate required fields based on mode
    if ((normalizedMode === "IN_PERSON" || mode === "in-person") && !room) {
      return res
        .status(400)
        .json({ error: "Room is required for in-person presentations" });
    }

    if ((normalizedMode === "ONLINE" || mode === "online") && !online_link) {
      return res
        .status(400)
        .json({ error: "Online link is required for online presentations" });
    }

    // Check if presentation already exists for this thesis
    const existingPresentations = await query(
      "SELECT id FROM presentations WHERE thesis_id = ?",
      [thesis_id]
    );

    if (existingPresentations.length > 0) {
      return res
        .status(409)
        .json({ error: "Presentation already scheduled for this thesis" });
    }

    // Validate scheduled date is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res
        .status(400)
        .json({ error: "Presentation must be scheduled for a future date" });
    }

    // Create presentation - format date properly for MySQL
    const mysqlDate = new Date(scheduled_at)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    // Date formatted for MySQL compatibility

    const params = [
      thesis_id,
      mysqlDate, // Use MySQL-compatible format
      normalizedMode || mode.toUpperCase(), // Use normalized mode
      room || null,
      online_link || null,
      user.id,
    ];

    const result = await query(
      `INSERT INTO presentations (thesis_id, scheduled_at, mode, room, online_link, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      params
    );

    // Create announcement record (optional)
    try {
      await query(
        `INSERT INTO announcements (presentation_id, published_at) 
         VALUES (?, NOW())`,
        [result.insertId]
      );
    } catch (announcementError) {
      console.error(
        "Warning: Could not create announcement:",
        announcementError.message
      );
      // Continue without announcement - presentation is still created
    }

    res.status(201).json({
      message: "Presentation scheduled successfully",
      presentationId: result.insertId,
    });
  } catch (error) {
    console.error("=== CREATE PRESENTATION ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("SQL state:", error.sqlState);
    console.error("SQL message:", error.sqlMessage);
    console.error("Stack:", error.stack);
    console.error("===================================");
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Update presentation
const updatePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, mode, room, online_link } = req.body;
    const { user } = req;

    // Get presentation and thesis details
    const presentations = await query(
      `
      SELECT 
        p.id,
        p.thesis_id,
        p.scheduled_at,
        th.supervisor_id,
        th.state,
        t.creator_id as topic_creator_id
      FROM presentations p
      JOIN theses th ON p.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (presentations.length === 0) {
      return res.status(404).json({ error: "Presentation not found" });
    }

    const presentation = presentations[0];

    // Check permissions
    const canUpdate =
      user.role === "secretary" ||
      user.id === presentation.supervisor_id ||
      user.id === presentation.topic_creator_id;

    if (!canUpdate) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if presentation is in the past
    const currentScheduled = new Date(presentation.scheduled_at);
    if (currentScheduled <= new Date() && user.role !== "secretary") {
      return res
        .status(400)
        .json({ error: "Cannot update past presentations" });
    }

    // Validate new scheduled date if provided
    if (scheduled_at) {
      const newScheduledDate = new Date(scheduled_at);
      if (newScheduledDate <= new Date()) {
        return res
          .status(400)
          .json({ error: "Presentation must be scheduled for a future date" });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (scheduled_at !== undefined) {
      updates.push("scheduled_at = ?");
      params.push(scheduled_at);
    }

    if (mode !== undefined) {
      updates.push("mode = ?");
      params.push(mode);
    }

    if (room !== undefined) {
      updates.push("room = ?");
      params.push(room);
    }

    if (online_link !== undefined) {
      updates.push("online_link = ?");
      params.push(online_link);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    await query(
      `UPDATE presentations SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    res.json({ message: "Presentation updated successfully" });
  } catch (error) {
    console.error("Update presentation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete presentation
const deletePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get presentation details
    const presentations = await query(
      `
      SELECT 
        p.id,
        p.thesis_id,
        p.scheduled_at,
        th.supervisor_id,
        t.creator_id as topic_creator_id
      FROM presentations p
      JOIN theses th ON p.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (presentations.length === 0) {
      return res.status(404).json({ error: "Presentation not found" });
    }

    const presentation = presentations[0];

    // Check permissions
    const canDelete =
      user.role === "secretary" ||
      user.id === presentation.supervisor_id ||
      user.id === presentation.topic_creator_id;

    if (!canDelete) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if presentation is in the past
    const scheduledDate = new Date(presentation.scheduled_at);
    if (scheduledDate <= new Date() && user.role !== "secretary") {
      return res
        .status(400)
        .json({ error: "Cannot delete past presentations" });
    }

    // Delete announcement first (foreign key constraint)
    await query("DELETE FROM announcements WHERE presentation_id = ?", [id]);

    // Delete presentation
    await query("DELETE FROM presentations WHERE id = ?", [id]);

    res.json({ message: "Presentation deleted successfully" });
  } catch (error) {
    console.error("Delete presentation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to generate XML format for presentations
const generateXML = (presentations) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<presentations>\n';

  presentations.forEach((presentation) => {
    xml += "  <presentation>\n";
    xml += `    <id>${presentation.id}</id>\n`;
    xml += `    <scheduled_at>${presentation.scheduled_at}</scheduled_at>\n`;
    xml += `    <mode>${presentation.mode}</mode>\n`;
    xml += `    <room>${presentation.room || ""}</room>\n`;
    xml += `    <topic_title><![CDATA[${presentation.topic_title}]]></topic_title>\n`;
    xml += `    <topic_summary><![CDATA[${
      presentation.topic_summary || ""
    }]]></topic_summary>\n`;
    xml += `    <student_name><![CDATA[${presentation.student_name}]]></student_name>\n`;
    xml += `    <student_am>${presentation.student_am}</student_am>\n`;
    xml += `    <supervisor_name><![CDATA[${presentation.supervisor_name}]]></supervisor_name>\n`;
    xml += "  </presentation>\n";
  });

  xml += "</presentations>";
  return xml;
};

module.exports = {
  getPresentations,
  getPublicPresentations,
  getPresentation,
  createPresentation,
  updatePresentation,
  deletePresentation,
};
