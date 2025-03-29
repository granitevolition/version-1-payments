const express = require('express');
const router = express.Router();
const db = require('../db');
const { checkTableExists } = require('../db/migration');

// Middleware to verify user is authenticated
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if session exists and is valid
    const sessionResult = await db.query(`
      SELECT s.user_id, s.expires_at, u.username, u.email
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.expires_at > NOW()
    `, [token]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    
    // Add user to request object
    req.user = {
      id: sessionResult.rows[0].user_id,
      username: sessionResult.rows[0].username,
      email: sessionResult.rows[0].email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Authentication failed'
    });
  }
};

// Get user's word balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    // Check if the user_words table exists
    const tableExists = await checkTableExists('user_words');
    if (!tableExists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Word balance system not initialized'
      });
    }
    
    // Get user's word balance
    const balanceResult = await db.query(`
      SELECT remaining_words, total_words_purchased, total_words_used,
             created_at, updated_at
      FROM user_words
      WHERE user_id = $1
    `, [req.user.id]);
    
    // If no balance record exists, create one
    if (balanceResult.rows.length === 0) {
      const newBalanceResult = await db.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ($1, 0, 0, 0)
        RETURNING remaining_words, total_words_purchased, total_words_used,
                  created_at, updated_at
      `, [req.user.id]);
      
      return res.status(200).json({
        balance: newBalanceResult.rows[0]
      });
    }
    
    res.status(200).json({
      balance: balanceResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching word balance:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch word balance'
    });
  }
});

// Check if user has enough words for an operation
router.get('/check/:requiredWords', authenticate, async (req, res) => {
  try {
    const { requiredWords } = req.params;
    const required = parseInt(requiredWords, 10);
    
    if (isNaN(required) || required < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Required words must be a positive number'
      });
    }
    
    // Get user's word balance
    const balanceResult = await db.query(`
      SELECT remaining_words
      FROM user_words
      WHERE user_id = $1
    `, [req.user.id]);
    
    // If no balance record exists, create one
    let remainingWords = 0;
    
    if (balanceResult.rows.length === 0) {
      const newBalanceResult = await db.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ($1, 0, 0, 0)
        RETURNING remaining_words
      `, [req.user.id]);
      
      remainingWords = newBalanceResult.rows[0].remaining_words;
    } else {
      remainingWords = balanceResult.rows[0].remaining_words;
    }
    
    // Check if user has enough words
    const hasEnough = remainingWords >= required;
    
    res.status(200).json({
      check: {
        hasEnough,
        required,
        remaining: remainingWords,
        deficit: hasEnough ? 0 : required - remainingWords
      }
    });
  } catch (error) {
    console.error('Error checking word balance:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to check word balance'
    });
  }
});

// Use words from user's balance
router.post('/use', authenticate, async (req, res) => {
  try {
    const { words } = req.body;
    const wordsToUse = parseInt(words, 10);
    
    if (isNaN(wordsToUse) || wordsToUse < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Words to use must be a positive number'
      });
    }
    
    // Get user's word balance
    const balanceResult = await db.query(`
      SELECT id, remaining_words
      FROM user_words
      WHERE user_id = $1
    `, [req.user.id]);
    
    // If no balance record exists, create one
    let userWordId, remainingWords;
    
    if (balanceResult.rows.length === 0) {
      const newBalanceResult = await db.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ($1, 0, 0, 0)
        RETURNING id, remaining_words
      `, [req.user.id]);
      
      userWordId = newBalanceResult.rows[0].id;
      remainingWords = newBalanceResult.rows[0].remaining_words;
    } else {
      userWordId = balanceResult.rows[0].id;
      remainingWords = balanceResult.rows[0].remaining_words;
    }
    
    // Check if user has enough words
    if (remainingWords < wordsToUse) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Insufficient word balance',
        check: {
          hasEnough: false,
          required: wordsToUse,
          remaining: remainingWords,
          deficit: wordsToUse - remainingWords
        }
      });
    }
    
    // Update user's word balance
    const updateResult = await db.query(`
      UPDATE user_words
      SET remaining_words = remaining_words - $1,
          total_words_used = total_words_used + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING remaining_words, total_words_purchased, total_words_used
    `, [wordsToUse, userWordId]);
    
    res.status(200).json({
      message: `Used ${wordsToUse} words successfully`,
      balance: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error using words:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to use words'
    });
  }
});

// Add words to user's balance (for admin or testing purposes)
router.post('/add', authenticate, async (req, res) => {
  try {
    const { words } = req.body;
    const wordsToAdd = parseInt(words, 10);
    
    if (isNaN(wordsToAdd) || wordsToAdd < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Words to add must be a positive number'
      });
    }
    
    // Get user's word balance
    const balanceResult = await db.query(`
      SELECT id
      FROM user_words
      WHERE user_id = $1
    `, [req.user.id]);
    
    // If no balance record exists, create one
    let userWordId;
    
    if (balanceResult.rows.length === 0) {
      const newBalanceResult = await db.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ($1, $2, $2, 0)
        RETURNING id
      `, [req.user.id, wordsToAdd]);
      
      userWordId = newBalanceResult.rows[0].id;
    } else {
      userWordId = balanceResult.rows[0].id;
      
      // Update user's word balance
      await db.query(`
        UPDATE user_words
        SET remaining_words = remaining_words + $1,
            total_words_purchased = total_words_purchased + $1,
            updated_at = NOW()
        WHERE id = $2
      `, [wordsToAdd, userWordId]);
    }
    
    // Get updated balance
    const updatedBalanceResult = await db.query(`
      SELECT remaining_words, total_words_purchased, total_words_used
      FROM user_words
      WHERE id = $1
    `, [userWordId]);
    
    res.status(200).json({
      message: `Added ${wordsToAdd} words successfully`,
      balance: updatedBalanceResult.rows[0]
    });
  } catch (error) {
    console.error('Error adding words:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to add words'
    });
  }
});

// Get usage statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get user's word balance and usage
    const balanceResult = await db.query(`
      SELECT remaining_words, total_words_purchased, total_words_used
      FROM user_words
      WHERE user_id = $1
    `, [req.user.id]);
    
    // If no balance record exists, create one
    let balance;
    
    if (balanceResult.rows.length === 0) {
      const newBalanceResult = await db.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ($1, 0, 0, 0)
        RETURNING remaining_words, total_words_purchased, total_words_used
      `, [req.user.id]);
      
      balance = newBalanceResult.rows[0];
    } else {
      balance = balanceResult.rows[0];
    }
    
    // Get payment statistics
    const paymentStatsResult = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_spent,
        SUM(words_added) as total_purchased
      FROM payments
      WHERE user_id = $1 AND status = 'completed'
    `, [req.user.id]);
    
    const paymentStats = paymentStatsResult.rows[0];
    
    // Calculate usage statistics
    const usagePercentage = balance.total_words_purchased > 0 
      ? (balance.total_words_used / balance.total_words_purchased) * 100 
      : 0;
    
    res.status(200).json({
      stats: {
        balance: {
          remaining: balance.remaining_words,
          purchased: balance.total_words_purchased,
          used: balance.total_words_used,
          usagePercentage: parseFloat(usagePercentage.toFixed(2))
        },
        payments: {
          count: parseInt(paymentStats.total_payments) || 0,
          totalSpent: parseFloat(paymentStats.total_spent) || 0,
          totalPurchased: parseInt(paymentStats.total_purchased) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch usage statistics'
    });
  }
});

module.exports = router;