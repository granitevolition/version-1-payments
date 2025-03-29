const { pool } = require('../config/db');
const logger = require('../utils/logger');

/**
 * UserWords Model - handles operations related to user word balance
 */
class UserWords {
  /**
   * Get or create user's word balance
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User word balance
   */
  static async getOrCreate(userId) {
    try {
      // First try to find existing record
      const result = await pool.query(
        'SELECT * FROM user_words WHERE user_id = $1',
        [userId]
      );
      
      // If found, return it
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // If not found, create a new record
      const newRecord = await pool.query(
        `INSERT INTO user_words 
          (user_id, remaining_words, total_words_purchased, total_words_used)
         VALUES 
          ($1, 0, 0, 0)
         RETURNING *`,
        [userId]
      );
      
      return newRecord.rows[0];
    } catch (error) {
      logger.error('Failed to get/create user word balance', { error: error.message, userId });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Add words to user's balance
   * @param {number} userId - User ID
   * @param {number} wordsToAdd - Number of words to add
   * @returns {Promise<Object>} Updated user word balance
   */
  static async addWords(userId, wordsToAdd) {
    try {
      // Get current balance or create new record
      await this.getOrCreate(userId);
      
      // Update the balance
      const result = await pool.query(
        `UPDATE user_words 
         SET 
          remaining_words = remaining_words + $1,
          total_words_purchased = total_words_purchased + $1,
          last_updated = NOW()
         WHERE 
          user_id = $2
         RETURNING *`,
        [wordsToAdd, userId]
      );
      
      logger.info('Words added to user balance', { 
        userId, 
        wordsAdded: wordsToAdd,
        newBalance: result.rows[0].remaining_words
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add words to user balance', { 
        error: error.message, 
        userId, 
        wordsToAdd 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Use words from user's balance
   * @param {number} userId - User ID
   * @param {number} wordsToUse - Number of words to use
   * @returns {Promise<Object>} Updated user word balance
   */
  static async useWords(userId, wordsToUse) {
    try {
      // Get current balance
      const balance = await this.getOrCreate(userId);
      
      // Check if user has enough words
      if (balance.remaining_words < wordsToUse) {
        throw new Error(`Insufficient word balance. Have ${balance.remaining_words}, need ${wordsToUse}`);
      }
      
      // Update the balance
      const result = await pool.query(
        `UPDATE user_words 
         SET 
          remaining_words = remaining_words - $1,
          total_words_used = total_words_used + $1,
          last_updated = NOW()
         WHERE 
          user_id = $2
         RETURNING *`,
        [wordsToUse, userId]
      );
      
      logger.info('Words used from user balance', { 
        userId, 
        wordsUsed: wordsToUse,
        newBalance: result.rows[0].remaining_words
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to use words from user balance', { 
        error: error.message, 
        userId, 
        wordsToUse 
      });
      throw new Error(error.message);
    }
  }

  /**
   * Get user's word balance
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User word balance
   */
  static async getUserBalance(userId) {
    try {
      return await this.getOrCreate(userId);
    } catch (error) {
      logger.error('Failed to get user word balance', { 
        error: error.message, 
        userId 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = UserWords;