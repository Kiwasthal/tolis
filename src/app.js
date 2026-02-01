const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Import database and test connection
const { testConnection } = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth");
const topicsRoutes = require("./routes/topics");
const thesesRoutes = require("./routes/theses");
const invitationsRoutes = require("./routes/invitations");
const attachmentsRoutes = require("./routes/attachments");
const presentationsRoutes = require("./routes/presentations");
const gradesRoutes = require("./routes/grades");
const secretaryRoutes = require("./routes/secretary");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: { error: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files with caching configuration
// Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
// Reference: https://web.dev/articles/http-cache

// Public assets (CSS, JS, images) - cache for 7 days
// These files change infrequently and benefit from long cache times
app.use(
  express.static(path.join(__dirname, "../public"), {
    maxAge: "7d", // 7 days for CSS/JS/images
    etag: true, // Enable ETag for conditional requests
    lastModified: true, // Enable Last-Modified header
    setHeaders: (res, filepath) => {
      // HTML files should not be cached to ensure users get latest version
      if (filepath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
      // CSS and JS files - immutable when versioned, long cache otherwise
      else if (filepath.endsWith(".css") || filepath.endsWith(".js")) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      }
      // Images and fonts - can be cached longer
      else if (
        filepath.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
      ) {
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days
      }
    },
  })
);

// Uploaded files (thesis documents, PDFs) - cache for 1 day
// These may be updated by users, so shorter cache time is appropriate
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    maxAge: "1d", // 1 day for uploaded documents
    etag: true, // Enable ETag for cache validation
    lastModified: true,
    setHeaders: (res, filepath) => {
      // PDF documents
      if (filepath.endsWith(".pdf")) {
        res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
      }
      // Word documents and other files
      else {
        res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
      }
    },
  })
);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/topics", topicsRoutes);
app.use("/api/theses", thesesRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/presentations", presentationsRoutes);
app.use("/api/grades", gradesRoutes);
app.use("/api/secretary", secretaryRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "Connected" : "Disconnected",
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      timestamp: new Date().toISOString(),
      database: "Error",
      error: error.message,
    });
  }
});

// Serve frontend for non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.message,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
    });
  }

  // Database errors
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      error: "Duplicate entry - resource already exists",
    });
  }

  // Default error
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("Failed to connect to database. Server not started.");
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Thesis Management System running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
