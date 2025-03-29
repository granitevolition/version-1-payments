const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const logger = require('../utils/logger');

// JWT Secret - Should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if email already exists
    const userExists = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    // Create word balance entry for the user
    await db.query(
      'INSERT INTO user_words (user_id, total_purchased, words_used) VALUES ($1, $2, $3)',
      [result.rows[0].id, 0, 0]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    // Get user profile without password
    const result = await db.query(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get word balance
    const wordBalance = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    const balance = wordBalance.rows.length > 0 ? 
      wordBalance.rows[0] : 
      { total_purchased: 0, words_used: 0 };

    res.status(200).json({
      user,
      wordBalance: {
        total: balance.total_purchased,
        used: balance.words_used,
        remaining: balance.total_purchased - balance.words_used
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};
