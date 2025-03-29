const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Service for handling Lipia Online payment integration
 * Uses the URL directly instead of requiring an API key
 */
class LipiaService {
  constructor() {
    // Use the direct link provided in the environment, or default to the one from documentation
    this.baseUrl = process.env.LIPIA_URL || 'https://lipia-online.vercel.app/link/andikar';
    this.apiBaseUrl = 'https://lipia-api.kreativelabske.com/api';
  }

  /**
   * Initiates a payment request via Lipia Online
   * @param {string} phone - User's phone number in format 07XXXXXXXX
   * @param {number} amount - Amount to pay
   * @returns {Promise<Object>} - Payment response
   */
  async initiatePayment(phone, amount) {
    try {
      logger.info('Initiating Lipia payment', { phone, amount });
      
      // Format phone number if needed
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Make the API request
      const response = await axios.post(`${this.apiBaseUrl}/request/stk`, {
        phone: formattedPhone,
        amount: amount.toString()
      });
      
      logger.info('Payment initiated successfully', { 
        reference: response.data?.data?.reference,
        checkoutRequestID: response.data?.data?.CheckoutRequestID
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error initiating payment', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Return a standard error format
      return {
        success: false,
        message: error.response?.data?.message || 'Payment initiation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Format phone number to ensure it meets Lipia requirements
   * @param {string} phone - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with '07'
    if (cleaned.startsWith('254')) {
      cleaned = '0' + cleaned.substring(3);
    } else if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    
    return cleaned;
  }
  
  /**
   * Get the payment URL for the user
   * @returns {string} - Payment URL
   */
  getPaymentUrl() {
    return this.baseUrl;
  }
}

module.exports = new LipiaService();
