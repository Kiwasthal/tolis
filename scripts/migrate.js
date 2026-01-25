const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

async function runMigration() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "thesis_management",
      multipleStatements: true,
    });

    console.log("Connected to MySQL server");

    // Read and execute the migration SQL
    const sqlPath = path.join(__dirname, "init.sql");
    const sql = await fs.readFile(sqlPath, "utf8");

    console.log("Executing migration...");

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(";")
      .map((stmt) => {
        // Remove comments and trim
        return stmt
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("--"))
          .join("\n")
          .trim();
      })
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
