const { pool } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Payment Model - handles database operations for payments
 */
class Payment {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  static async create(paymentData) {
    const { user_id, phone, amount, metadata = {} } = paymentData;
    
    try {
      const result = await pool.query(
        `INSERT INTO payments 
          (user_id, phone, amount, status, metadata) 
         VALUES 
          ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, phone, amount, 'pending', metadata]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create payment record', { 
        error: error.message, 
        paymentData 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update payment with Lipia checkout information
   * @param {number} paymentId - Payment ID
   * @param {Object} checkoutData - Checkout data from Lipia
   * @returns {Promise<Object>} Updated payment
   */
  static async updateWithCheckout(paymentId, checkoutData) {
    const { reference, CheckoutRequestID } = checkoutData;
    
    try {
      const result = await pool.query(
        `UPDATE payments 
         SET 
          reference = $1, 
          checkout_request_id = $2,
          updated_at = NOW()
         WHERE 
          id = $3
         RETURNING *`,
        [reference, CheckoutRequestID, paymentId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update payment with checkout data', { 
        error: error.message, 
        paymentId, 
        checkoutData 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Calculate words to add based on payment amount
   * @param {number} amount - Payment amount
   * @returns {number} Words to add
   */
  static calculateWordsToAdd(amount) {
    // Convert to number and round to handle any potential string input
    const paymentAmount = Math.round(parseFloat(amount));
    
    // Match exact payment tiers
    switch (paymentAmount) {
      case 1500:
        return 30000;
      case 2500:
        return 60000;
      case 4000:
        return 100000;
      default:
        // For non-standard amounts, use a fallback calculation
        // or throw an error if you want to enforce specific amounts
        logger.warn('Non-standard payment amount', { amount: paymentAmount });
        if (paymentAmount >= 4000) {
          return 100000;
        } else if (paymentAmount >= 2500) {
          return 60000;
        } else if (paymentAmount >= 1500) {
          return 30000;
        } else {
          return 0; // No words for smaller amounts
        }
    }
  }

  /**
   * Update payment status
   * @param {string} checkoutRequestId - Checkout request ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if payment failed
   * @returns {Promise<Object>} Updated payment
   */
  static async updateStatus(checkoutRequestId, status, errorMessage = null) {
    try {
      // For completed payments, calculate words to add
      let wordsAdded = null;
      if (status === 'completed') {
        // Get payment amount first
        const paymentResult = await pool.query(
          'SELECT id, user_id, amount FROM payments WHERE checkout_request_id = $1',
          [checkoutRequestId]
        );
        
        if (paymentResult.rows.length > 0) {
          const { amount, user_id } = paymentResult.rows[0];
          wordsAdded = this.calculateWordsToAdd(amount);
          
          // Update the query to include words_added
          const query = `
            UPDATE payments 
            SET 
              status = $1, 
              error_message = $2,
              payment_date = NOW(),
              words_added = $3,
              updated_at = NOW()
            WHERE 
              checkout_request_id = $4
            RETURNING *`;
          
          const result = await pool.query(query, [status, errorMessage, wordsAdded, checkoutRequestId]);
          
          if (result.rows.length === 0) {
            throw new Error(`No payment found with checkout request ID: ${checkoutRequestId}`);
          }
          
          return result.rows[0];
        }
      }
      
      // For non-completed payments or if amount couldn't be found
      const query = `
        UPDATE payments 
        SET 
          status = $1, 
          error_message = $2,
          ${status === 'completed' ? 'payment_date = NOW(),' : ''}
          updated_at = NOW()
        WHERE 
          checkout_request_id = $3
        RETURNING *`;
      
      const result = await pool.query(query, [status, errorMessage, checkoutRequestId]);
      
      if (result.rows.length === 0) {
        throw new Error(`No payment found with checkout request ID: ${checkoutRequestId}`);
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update payment status', { 
        error: error.message, 
        checkoutRequestId, 
        status 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Find payment by ID
   * @param {number} id - Payment ID
   * @returns {Promise<Object>} Payment
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find payment by ID', { error: error.message, id });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Find payment by checkout request ID
   * @param {string} checkoutRequestId - Checkout request ID
   * @returns {Promise<Object>} Payment
   */
  static async findByCheckoutRequestId(checkoutRequestId) {
    try {
      const result = await pool.query(
        'SELECT * FROM payments WHERE checkout_request_id = $1',
        [checkoutRequestId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find payment by checkout request ID', { 
        error: error.message, 
        checkoutRequestId 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get user's payment history
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} Payment history
   */
  static async getUserPayments(userId, limit = 10, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT * FROM payments 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user payment history', { 
        error: error.message, 
        userId 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get pending payments older than a certain time
   * @param {number} minutes - Minutes threshold
   * @returns {Promise<Array>} Pending payments
   */
  static async getPendingPaymentsOlderThan(minutes = 30) {
    try {
      const result = await pool.query(
        `SELECT * FROM payments 
         WHERE 
           status = 'pending' AND 
           created_at < NOW() - INTERVAL '${minutes} minutes'`
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get aged pending payments', { 
        error: error.message, 
        minutes 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   * @param {number} userId - User ID (optional)
   * @param {string} fromDate - Start date (optional)
   * @param {string} toDate - End date (optional)
   * @returns {Promise<Object>} Payment statistics
   */
  static async getStats(userId = null, fromDate = null, toDate = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
        FROM payments
        WHERE 1=1
      `;
      
      const params = [];
      
      // Add user filter if provided
      if (userId) {
        query += ` AND user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
      // Add date range filter if provided
      if (fromDate) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(fromDate);
      }
      
      if (toDate) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(toDate);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get payment statistics', { 
        error: error.message, 
        userId, 
        fromDate, 
        toDate 
      });
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Payment;