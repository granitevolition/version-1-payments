const express = require('express');
const { 
  getWordBalance, 
  addWords, 
  useWords,
  checkBalance,
  getStats
} = require('../controllers/words.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Get user's word balance (protected route)
router.get('/balance', auth, getWordBalance);

// Add words to user's balance (protected route)
router.post('/add', auth, addWords);

// Use words from user's balance (protected route)
router.post('/use', auth, useWords);

// Check if user has sufficient balance (public API for other services)
router.get('/check-balance/:userId/:requiredWords', checkBalance);

// Get user's word usage statistics (protected route)
router.get('/stats', auth, getStats);

module.exports = router;
