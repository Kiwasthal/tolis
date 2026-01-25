const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function seedDatabase() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "thesis_management",
    });

    console.log("Connected to database");

    // Read seed data
    const seedPath = path.join(__dirname, "..", "seeds.json");
    const seedData = JSON.parse(await fs.readFile(seedPath, "utf8"));

    // Hash passwords for users
    const defaultPassword = await bcrypt.hash("password123", 10);

    console.log("Seeding users...");
    for (const user of seedData.users) {
      const hashedPassword =
        user.password_hash === "<pw>" ? defaultPassword : user.password_hash;

      await connection.execute(
        `INSERT INTO users (id, role, am, full_name, email, password_hash) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         role = VALUES(role), 
         am = VALUES(am), 
         full_name = VALUES(full_name), 
         email = VALUES(email)`,
        [
          user.id,
          user.role,
          user.am || null,
          user.full_name,
          user.email,
          hashedPassword,
        ]
      );
    }

    console.log("Seeding topics...");
    for (const topic of seedData.topics) {
      await connection.execute(
        `INSERT INTO topics (id, title, summary, creator_id) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         title = VALUES(title), 
         summary = VALUES(summary), 
         creator_id = VALUES(creator_id)`,
        [topic.id, topic.title, topic.summary, topic.creator_id]
      );
    }

    console.log("Seeding theses...");
    for (const thesis of seedData.theses) {
      await connection.execute(
        `INSERT INTO theses (id, topic_id, student_id, supervisor_id, state, assigned_at, started_at, finalized_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         topic_id = VALUES(topic_id), 
         student_id = VALUES(student_id), 
         supervisor_id = VALUES(supervisor_id), 
         state = VALUES(state), 
         assigned_at = VALUES(assigned_at), 
         started_at = VALUES(started_at), 
         finalized_at = VALUES(finalized_at)`,
        [
          thesis.id,
          thesis.topic_id,
          thesis.student_id,
          thesis.supervisor_id,
          thesis.state,
          thesis.assigned_at ? new Date(thesis.assigned_at) : null,
          thesis.started_at ? new Date(thesis.started_at) : null,
          thesis.finalized_at ? new Date(thesis.finalized_at) : null,
        ]
      );
    }

    console.log("Database seeded successfully!");
    console.log("Default password for all users: password123");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
