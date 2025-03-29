const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * UserWords Model
 * Handles database operations for user word balances
 */
class UserWords {
  /**
   * Get a user's word balance
   * @param {string} userId - User ID
   * @returns {Object} User word balance
   */
  static async getUserBalance(userId) {
    try {
      const result = await query(
        'SELECT * FROM user_words WHERE user_id = $1',
        [userId]
      );
      
      // If user doesn't have a record yet, create one
      if (result.rows.length === 0) {
        return await this.createUserBalance(userId);
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user word balance', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Create a new user word balance record
   * @param {string} userId - User ID
   * @returns {Object} Created user word balance
   */
  static async createUserBalance(userId) {
    try {
      const result = await query(
        `INSERT INTO user_words 
         (user_id, remaining_words, total_words_purchased, total_words_used) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, 0, 0, 0]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user word balance', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Add words to a user's balance
   * @param {string} userId - User ID
   * @param {number} wordsToAdd - Number of words to add
   * @returns {Object} Updated user word balance
   */
  static async addWords(userId, wordsToAdd) {
    try {
      // Get current balance or create if doesn't exist
      await this.getUserBalance(userId);
      
      // Add words to balance
      const result = await query(
        `UPDATE user_words 
         SET remaining_words = remaining_words + $2, 
             total_words_purchased = total_words_purchased + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 
         RETURNING *`,
        [userId, wordsToAdd]
      );
      
      logger.info('Words added to user balance', {
        userId,
        wordsAdded: wordsToAdd,
        newBalance: result.rows[0].remaining_words
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding words to user balance', { error: error.message, userId, wordsToAdd });
      throw error;
    }
  }
  
  /**
   * Use words from a user's balance
   * @param {string} userId - User ID
   * @param {number} wordsToUse - Number of words to use
   * @returns {Object} Updated user word balance
   */
  static async useWords(userId, wordsToUse) {
    try {
      // Get current balance
      const userBalance = await this.getUserBalance(userId);
      
      // Check if user has enough words
      if (userBalance.remaining_words < wordsToUse) {
        throw new Error('Insufficient word balance');
      }
      
      // Use words from balance
      const result = await query(
        `UPDATE user_words 
         SET remaining_words = remaining_words - $2, 
             total_words_used = total_words_used + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 
         RETURNING *`,
        [userId, wordsToUse]
      );
      
      logger.info('Words used from user balance', {
        userId,
        wordsUsed: wordsToUse,
        newBalance: result.rows[0].remaining_words
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error using words from user balance', { error: error.message, userId, wordsToUse });
      throw error;
    }
  }
  
  /**
   * Check if a user has enough words for an operation
   * @param {string} userId - User ID
   * @param {number} requiredWords - Number of required words
   * @returns {boolean} True if user has enough words
   */
  static async hasEnoughWords(userId, requiredWords) {
    try {
      const userBalance = await this.getUserBalance(userId);
      return userBalance.remaining_words >= requiredWords;
    } catch (error) {
      logger.error('Error checking if user has enough words', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Get the usage history for a user
   * @param {string} userId - User ID
   * @returns {Object} Usage statistics
   */
  static async getUsageStats(userId) {
    try {
      // Get current balance
      const userBalance = await this.getUserBalance(userId);
      
      // Get payment history
      const paymentResult = await query(
        `SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_spent,
          SUM(words_added) as total_purchased
         FROM payments 
         WHERE user_id = $1 AND status = 'completed'`,
        [userId]
      );
      
      return {
        remaining_words: userBalance.remaining_words,
        total_words_purchased: userBalance.total_words_purchased,
        total_words_used: userBalance.total_words_used,
        payments: paymentResult.rows[0]
      };
    } catch (error) {
      logger.error('Error getting user usage stats', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = UserWords;