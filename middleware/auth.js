const { verifyToken, getUserById } = require('../config/passport');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT auth error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Logout (JWT tokens are stateless, so logout is handled on the frontend)
const logout = async (req, res) => {
  // With JWT, tokens are stateless, so logout is handled on the frontend
  // by removing the token from storage
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  authenticateToken,
  logout
};
