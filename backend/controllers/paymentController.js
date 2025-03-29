const lipiaService = require('../services/lipiaService');
const Payment = require('../models/payment');
const UserWords = require('../models/userWords');
const logger = require('../utils/logger');

/**
 * Controller for handling payment operations
 */
class PaymentController {
  /**
   * Initiate a new payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initiatePayment(req, res) {
    try {
      const { phone, amount, userId } = req.body;

      // Validate input
      if (!phone || !amount || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Phone, amount, and userId are required'
        });
      }

      // Validate amount is one of the fixed pricing tiers
      const validAmounts = [1500, 2500, 4000];
      if (!validAmounts.includes(Number(amount))) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be one of: 1,500, 2,500, or 4,000 KES'
        });
      }

      // Calculate word credits based on payment amount
      let wordsToAdd = 0;
      switch (Number(amount)) {
        case 1500:
          wordsToAdd = 30000;
          break;
        case 2500:
          wordsToAdd = 60000;
          break;
        case 4000:
          wordsToAdd = 100000;
          break;
      }

      // Create payment record in database
      const payment = await Payment.create({
        userId,
        phone,
        amount: Number(amount),
        words_added: wordsToAdd,
        status: 'pending'
      });

      // Initiate payment with Lipia
      const response = await lipiaService.initiatePayment(phone, amount);

      // If payment initiation was successful
      if (response.data && response.data.reference) {
        // Update payment record with reference
        await Payment.update(payment.id, {
          reference: response.data.reference,
          checkout_request_id: response.data.CheckoutRequestID,
          status: 'processing'
        });

        return res.status(200).json({
          success: true,
          message: 'Payment initiated successfully',
          data: {
            paymentId: payment.id,
            reference: response.data.reference,
            checkoutRequestId: response.data.CheckoutRequestID,
            wordsToAdd
          }
        });
      } else {
        // Update payment record with error
        await Payment.update(payment.id, {
          status: 'failed',
          error_message: response.message || 'Payment initiation failed'
        });

        return res.status(400).json({
          success: false,
          message: response.message || 'Payment initiation failed'
        });
      }
    } catch (error) {
      logger.error('Error initiating payment', { error: error.message });
      
      return res.status(500).json({
        success: false,
        message: 'Server error while processing payment',
        error: error.message
      });
    }
  }

  /**
   * Handle payment callback from Lipia
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCallback(req, res) {
    try {
      const { reference, CheckoutRequestID, status } = req.body;

      logger.info('Payment callback received', { reference, CheckoutRequestID, status });

      // Find payment by reference or checkout request ID
      const payment = await Payment.findByReference(reference || CheckoutRequestID);

      if (!payment) {
        logger.error('Payment not found for callback', { reference, CheckoutRequestID });
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // If payment is already completed or failed, ignore callback
      if (['completed', 'failed'].includes(payment.status)) {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed'
        });
      }

      // Process successful payment
      if (status === 'success') {
        // Update payment status
        await Payment.update(payment.id, {
          status: 'completed',
          payment_date: new Date()
        });

        // Add words to user's balance
        await UserWords.addWords(payment.userId, payment.words_added);

        logger.info('Payment completed successfully', { 
          paymentId: payment.id, 
          userId: payment.userId,
          wordsAdded: payment.words_added
        });

        return res.status(200).json({
          success: true,
          message: 'Payment processed successfully'
        });
      } 
      // Process failed payment
      else {
        // Update payment status
        await Payment.update(payment.id, {
          status: 'failed',
          error_message: req.body.message || 'Payment failed'
        });

        logger.info('Payment failed', { 
          paymentId: payment.id, 
          reason: req.body.message
        });

        return res.status(200).json({
          success: true,
          message: 'Payment failure recorded'
        });
      }
    } catch (error) {
      logger.error('Error processing payment callback', { error: error.message });
      
      return res.status(500).json({
        success: false,
        message: 'Server error while processing callback',
        error: error.message
      });
    }
  }

  /**
   * Get payment details by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Error getting payment by ID', { error: error.message });
      
      return res.status(500).json({
        success: false,
        message: 'Server error while getting payment',
        error: error.message
      });
    }
  }

  /**
   * Get user's payment history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserPayments(req, res) {
    try {
      const { userId } = req.params;
      
      const payments = await Payment.findByUserId(userId);
      
      return res.status(200).json({
        success: true,
        data: payments
      });
    } catch (error) {
      logger.error('Error getting user payments', { error: error.message });
      
      return res.status(500).json({
        success: false,
        message: 'Server error while getting user payments',
        error: error.message
      });
    }
  }

  /**
   * Get payment URL for the frontend
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getPaymentUrl(req, res) {
    try {
      const url = lipiaService.getPaymentUrl();
      
      return res.status(200).json({
        success: true,
        data: {
          url
        }
      });
    } catch (error) {
      logger.error('Error getting payment URL', { error: error.message });
      
      return res.status(500).json({
        success: false,
        message: 'Server error while getting payment URL',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();
