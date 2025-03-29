const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @route   POST /api/v1/payments/initiate
 * @desc    Initiate a new payment
 * @access  Private
 */
router.post('/initiate', paymentController.initiatePayment);

/**
 * @route   POST /api/v1/payments/callback
 * @desc    Handle callback from Lipia Online
 * @access  Public
 */
router.post('/callback', paymentController.handleCallback);

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment details by ID
 * @access  Private
 */
router.get('/:paymentId', paymentController.getPaymentById);

/**
 * @route   GET /api/v1/payments/user/:userId
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/user/:userId', paymentController.getUserPayments);

/**
 * @route   GET /api/v1/payments/url
 * @desc    Get payment URL for the frontend
 * @access  Public
 */
router.get('/url', paymentController.getPaymentUrl);

/**
 * @route   GET /api/v1/payments/status/:reference
 * @desc    Check payment status by reference
 * @access  Private
 */
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const payment = await Payment.findByReference(reference);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        wordsAdded: payment.words_added,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment status',
      error: error.message
    });
  }
});

module.exports = router;