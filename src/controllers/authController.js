const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const users = await query(
      "SELECT id, role, am, full_name, email, password_hash FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Logout user (client-side token removal)
const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might maintain a blacklist of tokens
    // For now, we rely on client-side token removal
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { user } = req;

    // Get complete user profile from database including phone and address
    const users = await query(
      "SELECT id, role, am, full_name, email, phone, address, created_at FROM users WHERE id = ?",
      [user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { user } = req;
    const { phone, address } = req.body;

    // Update only the allowed profile fields
    const result = await query(
      `UPDATE users SET phone = ?, address = ? WHERE id = ?`,
      [phone || null, address || null, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return updated profile
    const updatedUsers = await query(
      "SELECT id, role, am, full_name, email, phone, address, created_at FROM users WHERE id = ?",
      [user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedUsers[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Register new user (admin only)
const register = async (req, res) => {
  try {
    const { role, am, full_name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUsers = await query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(
      `INSERT INTO users (role, am, full_name, email, password_hash, phone, address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [role, am, full_name, email, password_hash, phone, address]
    );

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  updateProfile,
  register,
};
