const { query } = require("../config/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    // Support Greek and other Unicode letters, numbers, hyphens, and underscores
    const sanitizedName = basename.replace(/[^\p{L}\p{N}\-_]/gu, "_");
    cb(null, `${timestamp}_${sanitizedName}${ext}`);
  },
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  // Allowed file types for thesis documents
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
    "image/jpeg",
    "image/png",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, TXT, ZIP, and image files are allowed."
      )
    );
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5, // Maximum 5 files per request
  },
});

// Get attachments for a thesis
const getAttachments = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { user } = req;
    const { is_draft } = req.query;

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

    // Build query with optional draft filter
    let sql = `
      SELECT 
        a.id,
        a.filename,
        a.file_url,
        a.mime,
        a.is_draft,
        a.uploaded_at,
        u.id as uploaded_by_id,
        u.full_name as uploaded_by_name,
        u.role as uploaded_by_role
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.thesis_id = ?
    `;

    const params = [thesis_id];

    if (is_draft !== undefined) {
      sql += " AND a.is_draft = ?";
      params.push(is_draft === "true");
    }

    sql += " ORDER BY a.uploaded_at DESC";

    const attachments = await query(sql, params);
    res.json({ attachments });
  } catch (error) {
    console.error("Get attachments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Upload attachment(s) to thesis
const uploadAttachments = async (req, res) => {
  try {
    const { thesis_id } = req.params;
    const { user } = req;
    const { is_draft = "true" } = req.body;

    // Check if user can upload to this thesis
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

    // Check upload permissions
    const canUpload =
      user.role === "secretary" ||
      user.id === thesis.student_id ||
      user.id === thesis.supervisor_id ||
      user.id === thesis.topic_creator_id;

    if (!canUpload) {
      // Check if user is a committee member
      const committeeMember = await query(
        "SELECT id FROM committee_members WHERE thesis_id = ? AND instructor_id = ?",
        [thesis_id, user.id]
      );

      if (committeeMember.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Check if thesis allows uploads (not completed or cancelled)
    if (
      ["COMPLETED", "CANCELLED"].includes(thesis.state) &&
      user.role !== "secretary"
    ) {
      return res
        .status(400)
        .json({ error: "Cannot upload to completed/cancelled thesis" });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    // Process each uploaded file
    for (const file of req.files) {
      const fileUrl = `/uploads/${file.filename}`;

      // Insert attachment record
      const result = await query(
        `INSERT INTO attachments (thesis_id, uploaded_by, filename, file_url, mime, is_draft) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          thesis_id,
          user.id,
          file.originalname,
          fileUrl,
          file.mimetype,
          is_draft === "true",
        ]
      );

      uploadedFiles.push({
        id: result.insertId,
        filename: file.originalname,
        file_url: fileUrl,
        mime: file.mimetype,
        size: file.size,
        is_draft: is_draft === "true",
      });
    }

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload attachments error:", error);

    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large" });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Too many files" });
    }
    if (error.message.includes("Invalid file type")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

// Download/serve attachment file
const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get attachment and thesis details
    const attachments = await query(
      `
      SELECT 
        a.id,
        a.thesis_id,
        a.filename,
        a.file_url,
        a.mime,
        a.is_draft,
        th.student_id,
        th.supervisor_id,
        t.creator_id as topic_creator_id
      FROM attachments a
      JOIN theses th ON a.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      WHERE a.id = ?
    `,
      [id]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = attachments[0];

    // Check access permissions
    const hasAccess =
      user.role === "secretary" ||
      user.id === attachment.student_id ||
      user.id === attachment.supervisor_id ||
      user.id === attachment.topic_creator_id;

    if (!hasAccess) {
      // Check if user is a committee member
      const committeeMember = await query(
        "SELECT id FROM committee_members WHERE thesis_id = ? AND instructor_id = ?",
        [attachment.thesis_id, user.id]
      );

      if (committeeMember.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Construct file path
    const filePath = path.join(
      __dirname,
      "../../uploads",
      path.basename(attachment.file_url)
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Set appropriate headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.filename}"`
    );
    res.setHeader("Content-Type", attachment.mime);

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Download attachment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete attachment
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get attachment details
    const attachments = await query(
      `
      SELECT 
        a.id,
        a.thesis_id,
        a.file_url,
        a.uploaded_by,
        th.student_id,
        th.supervisor_id,
        th.state,
        t.creator_id as topic_creator_id
      FROM attachments a
      JOIN theses th ON a.thesis_id = th.id
      JOIN topics t ON th.topic_id = t.id
      WHERE a.id = ?
    `,
      [id]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = attachments[0];

    // Check delete permissions
    const canDelete =
      user.role === "secretary" ||
      user.id === attachment.uploaded_by ||
      (user.id === attachment.supervisor_id &&
        attachment.uploaded_by === attachment.student_id);

    if (!canDelete) {
      return res
        .status(403)
        .json({ error: "Access denied - insufficient permissions" });
    }

    // Prevent deletion from completed thesis (except by secretary)
    if (attachment.state === "COMPLETED" && user.role !== "secretary") {
      return res
        .status(400)
        .json({ error: "Cannot delete attachments from completed thesis" });
    }

    // Delete from database
    await query("DELETE FROM attachments WHERE id = ?", [id]);

    // Delete file from disk
    try {
      const filePath = path.join(
        __dirname,
        "../../uploads",
        path.basename(attachment.file_url)
      );
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file from disk:", error);
      // Continue - database record is already deleted
    }

    res.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Delete attachment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update attachment metadata (draft status, etc.)
const updateAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_draft } = req.body;
    const { user } = req;

    // Get attachment details
    const attachments = await query(
      `
      SELECT 
        a.id,
        a.thesis_id,
        a.uploaded_by,
        th.student_id,
        th.supervisor_id,
        th.state
      FROM attachments a
      JOIN theses th ON a.thesis_id = th.id
      WHERE a.id = ?
    `,
      [id]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = attachments[0];

    // Check update permissions
    const canUpdate =
      user.role === "secretary" ||
      user.id === attachment.uploaded_by ||
      user.id === attachment.supervisor_id;

    if (!canUpdate) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (is_draft !== undefined) {
      updates.push("is_draft = ?");
      params.push(is_draft);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    await query(
      `UPDATE attachments SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    res.json({ message: "Attachment updated successfully" });
  } catch (error) {
    console.error("Update attachment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  upload, // Multer middleware
  getAttachments,
  uploadAttachments,
  downloadAttachment,
  deleteAttachment,
  updateAttachment,
};
