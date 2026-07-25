const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.user_id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * LOGIN - Authenticate user and return token
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        teacher: true,
        parent: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled. Please contact administrator.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data and token
    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone_number: user.phone_number
      },
      requiresOtp: false // Set to true if you want to implement OTP
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * VERIFY OTP - Verify OTP code (optional feature)
 * POST /api/auth/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    // For demo purposes, accept any 6-digit OTP
    // In production, implement proper OTP verification
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * VERIFY TOKEN - Verify JWT token (for middleware)
 * GET /api/auth/verify
 */
async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid token or user not active' });
    }

    res.json({
      valid: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  login,
  verifyOtp,
  verifyToken
};
