const express = require('express');
const { register, login, getProfile } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user profile (protected route)
router.get('/profile', auth, getProfile);

module.exports = router;
