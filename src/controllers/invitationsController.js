const { query } = require("../config/database");

// Get invitations for the logged-in instructor
const getInvitations = async (req, res) => {
  try {
    const { user } = req;
    const { status } = req.query;

    if (user.role !== "instructor") {
      return res
        .status(403)
        .json({ error: "Only instructors can view invitations" });
    }

    let sql = `
      SELECT 
        i.id,
        i.thesis_id,
        i.status,
        i.invited_at,
        i.responded_at,
        th.state as thesis_state,
        t.title as topic_title,
        t.summary as topic_summary,
        s.full_name as student_name,
        s.am as student_am,
        sup.full_name as supervisor_name
      FROM invitations i
      JOIN theses th ON i.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      JOIN users s ON th.student_id = s.id
      JOIN users sup ON th.supervisor_id = sup.id
      WHERE i.instructor_id = ?
    `;

    const params = [user.id];

    if (status) {
      sql += " AND i.status = ?";
      params.push(status);
    }

    sql += " ORDER BY i.invited_at DESC";

    const invitations = await query(sql, params);
    res.json({ invitations });
  } catch (error) {
    console.error("Get invitations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create invitation for thesis committee
const createInvitation = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { instructor_id } = req.body;
    const { user } = req;

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

    // Check permissions - supervisor, topic creator, student, or secretary can invite
    const canInvite =
      user.role === "secretary" ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id ||
      user.id === thesis.student_id; // Allow students to invite committee members

    if (!canInvite) {
      return res
        .status(403)
        .json({ error: "Access denied - insufficient permissions" });
    }

    // Verify instructor exists and is actually an instructor
    const instructors = await query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'instructor'",
      [instructor_id]
    );

    if (instructors.length === 0) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    // Check if instructor is already on the committee
    const existingCommittee = await query(
      "SELECT id FROM committee_members WHERE thesis_id = ? AND instructor_id = ?",
      [thesis_id, instructor_id]
    );

    if (existingCommittee.length > 0) {
      return res
        .status(409)
        .json({ error: "Instructor is already on the committee" });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await query(
      "SELECT id FROM invitations WHERE thesis_id = ? AND instructor_id = ? AND status = 'PENDING'",
      [thesis_id, instructor_id]
    );

    if (existingInvitation.length > 0) {
      return res
        .status(409)
        .json({ error: "Invitation already pending for this instructor" });
    }

    // Prevent self-invitation (supervisor is already on committee)
    if (instructor_id == thesis.supervisor_id) {
      return res
        .status(400)
        .json({ error: "Supervisor is already on the committee" });
    }

    // Create invitation
    const result = await query(
      `INSERT INTO invitations (thesis_id, instructor_id, status, invited_at) 
       VALUES (?, ?, 'PENDING', NOW())`,
      [thesis_id, instructor_id]
    );

    res.status(201).json({
      message: "Invitation sent successfully",
      invitationId: result.insertId,
    });
  } catch (error) {
    console.error("Create invitation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Respond to invitation (accept/reject)
const respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const { user } = req;

    if (user.role !== "instructor") {
      return res
        .status(403)
        .json({ error: "Only instructors can respond to invitations" });
    }

    // Get invitation details
    const invitations = await query(
      `
      SELECT 
        i.id,
        i.thesis_id,
        i.instructor_id,
        i.status,
        th.state as thesis_state
      FROM invitations i
      JOIN theses th ON i.thesis_id = th.id
      WHERE i.id = ?
    `,
      [id]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const invitation = invitations[0];

    // Check if this invitation is for the logged-in instructor
    if (invitation.instructor_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Access denied - not your invitation" });
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Invitation has already been responded to" });
    }

    // Check if thesis is still active (not completed or cancelled)
    if (["COMPLETED", "CANCELLED"].includes(invitation.thesis_state)) {
      return res.status(400).json({
        error: "Cannot respond to invitation for completed/cancelled thesis",
      });
    }

    const status = action === "accept" ? "ACCEPTED" : "REJECTED";

    // Update invitation status
    await query(
      "UPDATE invitations SET status = ?, responded_at = NOW() WHERE id = ?",
      [status, id]
    );

    // If accepted, add to committee_members table
    if (action === "accept") {
      await query(
        `INSERT INTO committee_members (thesis_id, instructor_id, role, invited_at, accepted_at) 
         VALUES (?, ?, 'member', NOW(), NOW())`,
        [invitation.thesis_id, invitation.instructor_id]
      );

      // Check if we now have enough committee members to activate the thesis
      const committeeCount = await query(
        `SELECT COUNT(*) as count FROM committee_members 
         WHERE thesis_id = ? AND accepted_at IS NOT NULL`,
        [invitation.thesis_id]
      );

      // If we have 3 members (supervisor + 2 members) and thesis is UNDER_ASSIGNMENT, activate it
      if (committeeCount[0].count >= 3) {
        const currentThesis = await query(
          "SELECT state FROM theses WHERE id = ?",
          [invitation.thesis_id]
        );

        if (currentThesis[0] && currentThesis[0].state === "UNDER_ASSIGNMENT") {
          await query(
            "UPDATE theses SET state = 'ACTIVE', started_at = NOW() WHERE id = ?",
            [invitation.thesis_id]
          );
          console.log(
            `Thesis ${invitation.thesis_id} automatically activated - committee complete`
          );
        }
      }
    }

    res.json({
      message: `Invitation ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Respond to invitation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get thesis committee (for thesis detail view)
const getThesisCommittee = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { user } = req;

    // Check if user has access to this thesis
    const theses = await query(
      `
      SELECT 
        th.student_id,
        th.supervisor_id,
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
      ORDER BY cm.invited_at ASC
    `,
      [thesis_id]
    );

    // Get pending invitations (for supervisors and secretary)
    let pendingInvitations = [];
    if (
      user.role === "secretary" ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id
    ) {
      pendingInvitations = await query(
        `
        SELECT 
          i.id,
          i.invited_at,
          i.status,
          u.id as instructor_id,
          u.full_name as instructor_name,
          u.email as instructor_email
        FROM invitations i
        JOIN users u ON i.instructor_id = u.id
        WHERE i.thesis_id = ? AND i.status = 'PENDING'
        ORDER BY i.invited_at DESC
      `,
        [thesis_id]
      );
    }

    res.json({
      committee,
      pendingInvitations,
    });
  } catch (error) {
    console.error("Get thesis committee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get available instructors for invitation (excluding those already on committee)
const getAvailableInstructors = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { user } = req;

    // Check if user can invite (supervisor, topic creator, student, or secretary)
    const theses = await query(
      `
      SELECT 
        th.student_id,
        th.supervisor_id,
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

    const canInvite =
      user.role === "secretary" ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id ||
      user.id === thesis.student_id; // Allow students to get available instructors

    if (!canInvite) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get instructors not already on committee or with pending invitations
    const availableInstructors = await query(
      `
      SELECT 
        u.id,
        u.full_name,
        u.email
      FROM users u
      WHERE u.role = 'instructor'
      AND u.id NOT IN (
        SELECT cm.instructor_id 
        FROM committee_members cm 
        WHERE cm.thesis_id = ?
      )
      AND u.id NOT IN (
        SELECT i.instructor_id 
        FROM invitations i 
        WHERE i.thesis_id = ? AND i.status = 'PENDING'
      )
      ORDER BY u.full_name
    `,
      [thesis_id, thesis_id]
    );

    res.json({ availableInstructors });
  } catch (error) {
    console.error("Get available instructors error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getInvitations,
  createInvitation,
  respondToInvitation,
  getThesisCommittee,
  getAvailableInstructors,
};
