const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Generate JWT token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, picture, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    throw error;
  }
};

// Get user by email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user by email error:', error);
    throw error;
  }
};

// Create new user
const createUser = async (email, password, name) => {
  try {
    const passwordHash = await hashPassword(password);
    
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, picture, created_at, updated_at
    `, [email, passwordHash, name]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  getUserById,
  getUserByEmail,
  createUser,
  pool
};
