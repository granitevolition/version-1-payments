const express = require('express');
const router = express.Router();
const UserWords = require('../models/userWords');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/words/user/:userId
 * @desc    Get user's word balance
 * @access  Private
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const balance = await UserWords.getUserBalance(userId);
    
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
 * @route   POST /api/v1/words/add
 * @desc    Add words to user's balance
 * @access  Private
 */
router.post('/add', async (req, res) => {
  try {
    const { userId, words } = req.body;
    
    if (!userId || !words) {
      return res.status(400).json({
        success: false,
        message: 'UserId and words are required'
      });
    }
    
    const wordsToAdd = parseInt(words);
    if (isNaN(wordsToAdd) || wordsToAdd <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Words must be a positive number'
      });
    }
    
    const updatedBalance = await UserWords.addWords(userId, wordsToAdd);
    
    return res.status(200).json({
      success: true,
      message: `${wordsToAdd} words added to user's balance`,
      data: updatedBalance
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
 * @route   POST /api/v1/words/use
 * @desc    Use words from user's balance
 * @access  Private
 */
router.post('/use', async (req, res) => {
  try {
    const { userId, words } = req.body;
    
    if (!userId || !words) {
      return res.status(400).json({
        success: false,
        message: 'UserId and words are required'
      });
    }
    
    const wordsToUse = parseInt(words);
    if (isNaN(wordsToUse) || wordsToUse <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Words must be a positive number'
      });
    }
    
    // Check if user has enough words
    const balance = await UserWords.getUserBalance(userId);
    
    if (balance.remaining_words < wordsToUse) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient word balance',
        data: {
          remaining_words: balance.remaining_words,
          requested_words: wordsToUse
        }
      });
    }
    
    const updatedBalance = await UserWords.useWords(userId, wordsToUse);
    
    return res.status(200).json({
      success: true,
      message: `${wordsToUse} words used from user's balance`,
      data: updatedBalance
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

/**
 * @route   GET /api/v1/words/check-balance/:userId/:requiredWords
 * @desc    Check if user has enough words
 * @access  Private
 */
router.get('/check-balance/:userId/:requiredWords', async (req, res) => {
  try {
    const { userId, requiredWords } = req.params;
    
    const requiredWordsInt = parseInt(requiredWords);
    if (isNaN(requiredWordsInt) || requiredWordsInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Required words must be a positive number'
      });
    }
    
    const balance = await UserWords.getUserBalance(userId);
    const hasEnough = balance.remaining_words >= requiredWordsInt;
    
    return res.status(200).json({
      success: true,
      data: {
        has_enough: hasEnough,
        remaining_words: balance.remaining_words,
        required_words: requiredWordsInt,
        difference: balance.remaining_words - requiredWordsInt
      }
    });
  } catch (error) {
    logger.error('Error checking user word balance', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Server error while checking balance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/words/stats/:userId
 * @desc    Get user's word usage statistics
 * @access  Private
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await UserWords.getUsageStats(userId);
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user word stats', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Server error while getting word stats',
      error: error.message
    });
  }
});

module.exports = router;