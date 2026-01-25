const Joi = require("joi");

// Validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    // Debug logging removed - validation working correctly

    const { error } = schema.validate(req[property], { abortEarly: false });

    if (error) {
      console.log("Validation failed:", error.details);
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  // User schemas
  createUser: Joi.object({
    role: Joi.string().valid("student", "instructor", "secretary").required(),
    am: Joi.string().max(32).when("role", {
      is: "student",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    full_name: Joi.string().max(200).required(),
    email: Joi.string().email().max(200).required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().max(50).optional(),
    address: Joi.string().optional(),
  }),

  updateProfile: Joi.object({
    phone: Joi.string().max(50).allow("").optional(),
    address: Joi.string().allow("").optional(),
  }),

  // Topic schemas
  createTopic: Joi.object({
    title: Joi.string().max(300).required(),
    summary: Joi.string().optional(),
    description_pdf: Joi.string().max(500).optional(),
  }),

  updateTopic: Joi.object({
    title: Joi.string().max(300).optional(),
    summary: Joi.string().optional(),
    description_pdf: Joi.string().max(500).optional(),
  }),

  // Thesis schemas
  createThesis: Joi.object({
    topic_id: Joi.number().integer().positive().required(),
    student_id: Joi.number().integer().positive().required(),
    supervisor_id: Joi.number().integer().positive().required(),
  }),

  updateThesisState: Joi.object({
    state: Joi.string()
      .valid(
        "UNDER_ASSIGNMENT",
        "ACTIVE",
        "UNDER_REVIEW",
        "COMPLETED",
        "CANCELLED"
      )
      .required(),
    cancellation_reason: Joi.string().when("state", {
      is: "CANCELLED",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    ap_number: Joi.string().max(64).optional(),
  }),

  // Invitation schemas
  createInvitation: Joi.object({
    instructor_id: Joi.number().integer().positive().required(),
  }),

  respondToInvitation: Joi.object({
    action: Joi.string().valid("accept", "reject").required(),
  }),

  // Presentation schemas
  createPresentation: Joi.object({
    scheduled_at: Joi.alternatives()
      .try(
        Joi.date().iso(),
        Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      )
      .required(),
    mode: Joi.string()
      .valid("IN_PERSON", "ONLINE", "in-person", "online")
      .required(),
    room: Joi.string()
      .max(200)
      .allow("")
      .when("mode", {
        is: Joi.valid("IN_PERSON", "in-person"),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    online_link: Joi.string()
      .max(500)
      .allow("")
      .when("mode", {
        is: Joi.valid("ONLINE", "online"),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
  }),

  // Grade schemas
  createGrade: Joi.object({
    grade_numeric: Joi.number().min(0).max(10).precision(2).required(),
    comments: Joi.string().optional(),
  }),

  // Query parameter schemas
  dateRange: Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    format: Joi.string().valid("json", "xml", "csv").optional(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sort: Joi.string().optional(),
    order: Joi.string().valid("asc", "desc").optional(),
  }),
};

module.exports = {
  validate,
  schemas,
};
