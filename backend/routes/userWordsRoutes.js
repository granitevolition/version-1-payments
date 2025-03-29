const express = require('express');
const router = express.Router();
const UserWords = require('../models/userWords');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/words/user/:userId
 * @desc    Get user's word balance
 * @access  Private
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure the requesting user matches the userId or is an admin
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }
    
    const balance = await UserWords.getBalance(userId);
    
    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Error getting user word balance', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Server error while getting word balance',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/words/user/:userId/add
 * @desc    Add words to user's balance (admin only)
 * @access  Private/Admin
 */
router.post('/user/:userId/add', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { words } = req.body;
    
    // Validate input
    if (!words || isNaN(words) || words <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Words must be a positive number'
      });
    }
    
    // Only admins can manually add words
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }
    
    const balance = await UserWords.addWords(userId, parseInt(words));
    
    return res.status(200).json({
      success: true,
      message: `Added ${words} words to user's balance`,
      data: balance
    });
  } catch (error) {
    logger.error('Error adding words to user balance', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Server error while adding words',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/words/user/:userId/use
 * @desc    Use words from user's balance
 * @access  Private
 */
router.post('/user/:userId/use', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { words } = req.body;
    
    // Validate input
    if (!words || isNaN(words) || words <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Words must be a positive number'
      });
    }
    
    // Ensure the requesting user matches the userId
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }
    
    const result = await UserWords.useWords(userId, parseInt(words));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          currentBalance: result.currentBalance,
          requested: result.requested
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Used ${words} words from user's balance`,
      data: result.data
    });
  } catch (error) {
    logger.error('Error using words from user balance', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Server error while using words',
      error: error.message
    });
  }
});

module.exports = router;
