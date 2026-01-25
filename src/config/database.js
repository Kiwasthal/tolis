const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "thesis_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected successfully");
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  }
}

// Execute query helper
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query error:", error.message);
    throw error;
  }
}

// Get connection from pool
async function getConnection() {
  return await pool.getConnection();
}

module.exports = {
  pool,
  query,
  testConnection,
  getConnection,
};
