const db = require('../db');
const logger = require('../utils/logger');

// Get user's word balance
exports.getWordBalance = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    // If no record exists, create one with zero balance
    if (result.rows.length === 0) {
      await db.query(
        'INSERT INTO user_words (user_id, total_purchased, words_used) VALUES ($1, 0, 0)',
        [userId]
      );

      return res.status(200).json({
        total: 0,
        used: 0,
        remaining: 0
      });
    }

    const balance = result.rows[0];
    
    res.status(200).json({
      total: balance.total_purchased,
      used: balance.words_used,
      remaining: balance.total_purchased - balance.words_used
    });
  } catch (error) {
    logger.error('Get word balance error:', error);
    res.status(500).json({ message: 'Error fetching word balance', error: error.message });
  }
};

// Add words to user's balance
exports.addWords = async (req, res) => {
  const userId = req.user.id;
  const { words } = req.body;

  // Validate words parameter
  if (!words || isNaN(words) || words <= 0) {
    return res.status(400).json({ message: 'Invalid word count' });
  }

  try {
    // Check if user has a word balance record
    const checkResult = await db.query(
      'SELECT id FROM user_words WHERE user_id = $1',
      [userId]
    );

    if (checkResult.rows.length === 0) {
      // Create new record if it doesn't exist
      await db.query(
        'INSERT INTO user_words (user_id, total_purchased, words_used) VALUES ($1, $2, 0)',
        [userId, words]
      );
    } else {
      // Update existing record
      await db.query(
        'UPDATE user_words SET total_purchased = total_purchased + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [words, userId]
      );
    }

    // Get updated balance
    const result = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    const balance = result.rows[0];
    
    res.status(200).json({
      message: `Added ${words} words to balance`,
      total: balance.total_purchased,
      used: balance.words_used,
      remaining: balance.total_purchased - balance.words_used
    });
  } catch (error) {
    logger.error('Add words error:', error);
    res.status(500).json({ message: 'Error adding words', error: error.message });
  }
};

// Use words from user's balance
exports.useWords = async (req, res) => {
  const userId = req.user.id;
  const { words } = req.body;

  // Validate words parameter
  if (!words || isNaN(words) || words <= 0) {
    return res.status(400).json({ message: 'Invalid word count' });
  }

  try {
    // Check if user has enough words
    const result = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'No word balance found' });
    }

    const balance = result.rows[0];
    const remaining = balance.total_purchased - balance.words_used;

    if (remaining < words) {
      return res.status(400).json({ 
        message: 'Insufficient word balance',
        required: words,
        available: remaining
      });
    }

    // Update word usage
    await db.query(
      'UPDATE user_words SET words_used = words_used + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [words, userId]
    );

    // Get updated balance
    const updatedResult = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    const updatedBalance = updatedResult.rows[0];
    
    res.status(200).json({
      message: `Used ${words} words from balance`,
      total: updatedBalance.total_purchased,
      used: updatedBalance.words_used,
      remaining: updatedBalance.total_purchased - updatedBalance.words_used
    });
  } catch (error) {
    logger.error('Use words error:', error);
    res.status(500).json({ message: 'Error using words', error: error.message });
  }
};

// Check if user has sufficient balance
exports.checkBalance = async (req, res) => {
  const { userId, requiredWords } = req.params;
  
  if (!requiredWords || isNaN(requiredWords) || requiredWords <= 0) {
    return res.status(400).json({ message: 'Invalid word count' });
  }

  try {
    const result = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ 
        sufficient: false,
        required: parseInt(requiredWords),
        available: 0,
        message: 'No word balance found'
      });
    }

    const balance = result.rows[0];
    const remaining = balance.total_purchased - balance.words_used;
    const sufficient = remaining >= parseInt(requiredWords);
    
    res.status(200).json({
      sufficient,
      required: parseInt(requiredWords),
      available: remaining,
      message: sufficient ? 'Sufficient balance' : 'Insufficient balance'
    });
  } catch (error) {
    logger.error('Check balance error:', error);
    res.status(500).json({ message: 'Error checking balance', error: error.message });
  }
};

// Get user's word usage statistics
exports.getStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get word balance
    const balanceResult = await db.query(
      'SELECT total_purchased, words_used FROM user_words WHERE user_id = $1',
      [userId]
    );

    // Get payment history
    const paymentsResult = await db.query(
      'SELECT created_at, amount, word_count FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [userId, 'completed']
    );

    // Calculate stats
    let balance = { total_purchased: 0, words_used: 0 };
    if (balanceResult.rows.length > 0) {
      balance = balanceResult.rows[0];
    }

    const remaining = balance.total_purchased - balance.words_used;
    const usagePercentage = balance.total_purchased > 0 
      ? Math.round((balance.words_used / balance.total_purchased) * 100) 
      : 0;

    res.status(200).json({
      wordBalance: {
        total: balance.total_purchased,
        used: balance.words_used,
        remaining,
        usagePercentage
      },
      payments: paymentsResult.rows,
      stats: {
        totalPayments: paymentsResult.rows.length,
        totalAmountPaid: paymentsResult.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
        averageCostPerWord: balance.total_purchased > 0 
          ? paymentsResult.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) / balance.total_purchased 
          : 0
      }
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};
