const { pool } = require('../config/db');
const logger = require('../utils/logger');

/**
 * User Words model for tracking word balances
 */
class UserWords {
  /**
   * Get a user's word balance
   * @param {number|string} userId - User ID
   * @returns {Promise<Object>} - Word balance information
   */
  async getBalance(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM user_words WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Initialize a new record if none exists
        return this.initializeBalance(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching user word balance', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Initialize a new word balance for a user
   * @param {number|string} userId - User ID
   * @returns {Promise<Object>} - New word balance record
   */
  async initializeBalance(userId) {
    try {
      const result = await pool.query(
        `INSERT INTO user_words 
         (user_id, remaining_words, total_words_purchased, total_words_used) 
         VALUES ($1, 0, 0, 0) 
         RETURNING *`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error initializing user word balance', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Add words to a user's balance
   * @param {number|string} userId - User ID
   * @param {number} words - Number of words to add
   * @returns {Promise<Object>} - Updated word balance
   */
  async addWords(userId, words) {
    try {
      // Ensure user has a balance record
      await this.getBalance(userId);

      // Add words
      const result = await pool.query(
        `UPDATE user_words 
         SET remaining_words = remaining_words + $1, 
             total_words_purchased = total_words_purchased + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 
         RETURNING *`,
        [words, userId]
      );

      logger.info('Words added to user balance', { 
        userId, 
        wordsAdded: words, 
        newBalance: result.rows[0].remaining_words 
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error adding words to user balance', { 
        error: error.message, 
        userId,
        words
      });
      throw error;
    }
  }

  /**
   * Use words from a user's balance
   * @param {number|string} userId - User ID
   * @param {number} words - Number of words to use
   * @returns {Promise<Object>} - Updated word balance and status
   */
  async useWords(userId, words) {
    try {
      // Get current balance
      const balance = await this.getBalance(userId);

      // Check if user has enough words
      if (balance.remaining_words < words) {
        return {
          success: false,
          message: 'Insufficient word balance',
          currentBalance: balance.remaining_words,
          requested: words
        };
      }

      // Use words
      const result = await pool.query(
        `UPDATE user_words 
         SET remaining_words = remaining_words - $1, 
             total_words_used = total_words_used + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 
         RETURNING *`,
        [words, userId]
      );

      logger.info('Words used from user balance', { 
        userId, 
        wordsUsed: words, 
        newBalance: result.rows[0].remaining_words 
      });

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      logger.error('Error using words from user balance', { 
        error: error.message, 
        userId,
        words
      });
      throw error;
    }
  }
}

module.exports = new UserWords();
