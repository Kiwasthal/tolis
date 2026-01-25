const { query } = require("../config/database");

// Get all topics
const getTopics = async (req, res) => {
  try {
    const { creator_id, available } = req.query;
    let sql = `
      SELECT 
        t.id, 
        t.title, 
        t.summary, 
        t.description_pdf, 
        t.creator_id,
        t.created_at,
        u.full_name as creator_name,
        COUNT(th.id) as assignment_count
      FROM topics t
      JOIN users u ON t.creator_id = u.id
      LEFT JOIN theses th ON t.id = th.topic_id AND th.state != 'CANCELLED'
      WHERE 1=1
    `;

    const params = [];

    if (creator_id) {
      sql += " AND t.creator_id = ?";
      params.push(creator_id);
    }

    sql +=
      " GROUP BY t.id, t.title, t.summary, t.description_pdf, t.creator_id, t.created_at, u.full_name";

    if (available === "true") {
      sql += " HAVING assignment_count = 0";
    }

    sql += " ORDER BY t.created_at DESC";

    const topics = await query(sql, params);
    res.json({ topics });
  } catch (error) {
    console.error("Get topics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get single topic
const getTopic = async (req, res) => {
  try {
    const { id } = req.params;

    const topics = await query(
      `
      SELECT 
        t.id, 
        t.title, 
        t.summary, 
        t.description_pdf, 
        t.creator_id,
        t.created_at,
        u.full_name as creator_name,
        u.email as creator_email
      FROM topics t
      JOIN users u ON t.creator_id = u.id
      WHERE t.id = ?
    `,
      [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Get related theses
    const theses = await query(
      `
      SELECT 
        th.id,
        th.state,
        th.assigned_at,
        s.full_name as student_name,
        s.am as student_am
      FROM theses th
      JOIN users s ON th.student_id = s.id
      WHERE th.topic_id = ? AND th.state != 'CANCELLED'
    `,
      [id]
    );

    const topic = {
      ...topics[0],
      theses,
    };

    res.json({ topic });
  } catch (error) {
    console.error("Get topic error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new topic
const createTopic = async (req, res) => {
  try {
    const { title, summary, description_pdf } = req.body;
    const creator_id = req.user.id;

    const result = await query(
      "INSERT INTO topics (title, summary, description_pdf, creator_id) VALUES (?, ?, ?, ?)",
      [title, summary, description_pdf, creator_id]
    );

    res.status(201).json({
      message: "Topic created successfully",
      topicId: result.insertId,
    });
  } catch (error) {
    console.error("Create topic error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update topic
const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, description_pdf } = req.body;
    const userId = req.user.id;

    // Check if topic exists and user owns it
    const topics = await query("SELECT creator_id FROM topics WHERE id = ?", [
      id,
    ]);

    if (topics.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (topics[0].creator_id !== userId && req.user.role !== "secretary") {
      return res.status(403).json({ error: "Access denied - not topic owner" });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (summary !== undefined) {
      updates.push("summary = ?");
      params.push(summary);
    }
    if (description_pdf !== undefined) {
      updates.push("description_pdf = ?");
      params.push(description_pdf);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    await query(`UPDATE topics SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ message: "Topic updated successfully" });
  } catch (error) {
    console.error("Update topic error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete topic
const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if topic exists and user owns it
    const topics = await query("SELECT creator_id FROM topics WHERE id = ?", [
      id,
    ]);

    if (topics.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (topics[0].creator_id !== userId && req.user.role !== "secretary") {
      return res.status(403).json({ error: "Access denied - not topic owner" });
    }

    // Check if topic has active theses
    const activeTheses = await query(
      'SELECT COUNT(*) as count FROM theses WHERE topic_id = ? AND state NOT IN ("CANCELLED", "COMPLETED")',
      [id]
    );

    if (activeTheses[0].count > 0) {
      return res.status(409).json({
        error: "Cannot delete topic with active theses assignments",
      });
    }

    await query("DELETE FROM topics WHERE id = ?", [id]);

    res.json({ message: "Topic deleted successfully" });
  } catch (error) {
    console.error("Delete topic error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
};
