const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  generateToken, 
  comparePassword, 
  getUserByEmail, 
  createUser 
} = require('../config/passport');
const { authenticateToken, logout } = require('../middleware/auth');

const router = express.Router();

// POST /auth/register - Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    
    // Create new user
    const user = await createUser(email, password, name);
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login - Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Get user by email (includes password_hash)
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me - Get current user info
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture
  });
});

// POST /auth/logout - Logout user
router.post('/logout', logout);

// GET /auth/status - Check authentication status
router.get('/status', authenticateToken, (req, res) => {
  res.json({ 
    authenticated: true, 
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture
    }
  });
});

module.exports = router;
