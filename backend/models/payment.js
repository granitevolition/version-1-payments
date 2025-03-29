const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Payment Model
 * Handles database operations for payments
 */
class Payment {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Object} Created payment
   */
  static async create(paymentData) {
    try {
      const { userId, phone, amount, words_added, status } = paymentData;
      
      const result = await query(
        `INSERT INTO payments 
         (user_id, phone, amount, words_added, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`, 
        [userId, phone, amount, words_added, status]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating payment', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Update a payment record
   * @param {number} id - Payment ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated payment
   */
  static async update(id, updateData) {
    try {
      // Construct SET part of query dynamically based on updateData keys
      const keys = Object.keys(updateData);
      if (keys.length === 0) return null;
      
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const values = [id, ...keys.map(key => updateData[key])];
      
      const result = await query(
        `UPDATE payments 
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`, 
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating payment', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Find payment by ID
   * @param {number} id - Payment ID
   * @returns {Object} Payment record
   */
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM payments WHERE id = $1', 
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding payment by ID', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Find payment by reference or checkout request ID
   * @param {string} reference - Payment reference or checkout request ID
   * @returns {Object} Payment record
   */
  static async findByReference(reference) {
    try {
      const result = await query(
        'SELECT * FROM payments WHERE reference = $1 OR checkout_request_id = $1', 
        [reference]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding payment by reference', { error: error.message, reference });
      throw error;
    }
  }
  
  /**
   * Find all payments for a user
   * @param {string} userId - User ID
   * @returns {Array} Payment records
   */
  static async findByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', 
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error finding payments by user ID', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Get payment statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Payment statistics
   */
  static async getUserStats(userId) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_spent,
          SUM(words_added) as total_words_purchased
         FROM payments 
         WHERE user_id = $1 AND status = 'completed'`, 
        [userId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user payment stats', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Record a payment callback
   * @param {Object} callbackData - Callback data from payment provider
   * @returns {Object} Created callback record
   */
  static async recordCallback(callbackData) {
    try {
      const { reference, CheckoutRequestID, status } = callbackData;
      
      const result = await query(
        `INSERT INTO payment_callbacks 
         (reference, checkout_request_id, payload, status) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`, 
        [reference, CheckoutRequestID, JSON.stringify(callbackData), status]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording payment callback', { error: error.message });
      throw error;
    }
  }
}

module.exports = Payment;