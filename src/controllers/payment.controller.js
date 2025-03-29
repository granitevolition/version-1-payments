const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');
const logger = require('../utils/logger');

// Payment plans
const PAYMENT_PLANS = {
  basic: { price: 1500, words: 30000, name: 'Basic Plan' },
  standard: { price: 2500, words: 60000, name: 'Standard Plan' },
  premium: { price: 4000, words: 100000, name: 'Premium Plan' }
};

// Lipia URL from environment
const LIPIA_URL = process.env.LIPIA_URL || 'https://lipia-online.vercel.app/link/andikar';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://your-domain.com/api/payments/callback';

// Get payment plans
exports.getPlans = (req, res) => {
  res.status(200).json({ plans: PAYMENT_PLANS });
};

// Generate a unique reference
const generateReference = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY-${timestamp}-${random}`;
};

// Initiate payment
exports.initiatePayment = async (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;

  // Validate payment plan
  if (!PAYMENT_PLANS[plan]) {
    return res.status(400).json({ message: 'Invalid payment plan' });
  }

  const planDetails = PAYMENT_PLANS[plan];
  const reference = generateReference();

  try {
    // Record payment intent in database
    const result = await db.query(
      `INSERT INTO payments 
       (user_id, amount, plan_name, word_count, reference, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [
        userId,
        planDetails.price,
        planDetails.name,
        planDetails.words,
        reference,
        'pending'
      ]
    );

    const paymentId = result.rows[0].id;

    // Construct callback URL with reference
    const fullCallbackUrl = `${CALLBACK_URL}?reference=${reference}`;

    // Generate payment URL
    // Note: In a real implementation, you might need to make an API call to Lipia
    // to generate this URL. This is a simplified example.
    const paymentUrl = `${LIPIA_URL}?amount=${planDetails.price}&reference=${reference}&callback=${encodeURIComponent(fullCallbackUrl)}`;

    res.status(200).json({
      message: 'Payment initiated',
      paymentId,
      reference,
      amount: planDetails.price,
      planName: planDetails.name,
      wordCount: planDetails.words,
      paymentUrl
    });
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({ message: 'Error initiating payment', error: error.message });
  }
};

// Payment callback
exports.paymentCallback = async (req, res) => {
  const { reference, status, transactionId } = req.query;

  logger.info('Payment callback received:', { reference, status, transactionId });

  if (!reference || !status) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // Find payment by reference
    const paymentResult = await db.query(
      'SELECT * FROM payments WHERE reference = $1',
      [reference]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // If payment is already processed, prevent duplicate processing
    if (payment.status !== 'pending') {
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // Update payment status
    if (status === 'success' || status === 'completed') {
      // Update payment record
      await db.query(
        `UPDATE payments 
         SET status = $1, payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE reference = $2`,
        ['completed', reference]
      );

      // Update user's word balance
      await db.query(
        `INSERT INTO user_words (user_id, total_purchased, words_used)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
         total_purchased = user_words.total_purchased + $2,
         updated_at = CURRENT_TIMESTAMP`,
        [payment.user_id, payment.word_count]
      );

      // Return success with redirect
      return res.status(200).json({
        message: 'Payment processed successfully',
        status: 'completed',
        redirect: '/payment/success'
      });
    } else {
      // Update payment to failed
      await db.query(
        `UPDATE payments 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE reference = $2`,
        ['failed', reference]
      );

      // Return failure with redirect
      return res.status(200).json({
        message: 'Payment failed',
        status: 'failed',
        redirect: '/payment/failed'
      });
    }
  } catch (error) {
    logger.error('Payment callback error:', error);
    res.status(500).json({ message: 'Error processing payment callback', error: error.message });
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  const { reference } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE reference = $1',
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.rows[0];

    res.status(200).json({
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      planName: payment.plan_name,
      wordCount: payment.word_count,
      paymentDate: payment.payment_date
    });
  } catch (error) {
    logger.error('Check payment status error:', error);
    res.status(500).json({ message: 'Error checking payment status', error: error.message });
  }
};

// Get user's payment history
exports.getUserPayments = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({
      payments: result.rows
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({ message: 'Error fetching payment history', error: error.message });
  }
};

// Get payment URL for frontend (this will be used by the modal popup)
exports.getPaymentUrl = (req, res) => {
  const { amount, reference, callback } = req.query;

  if (!amount || !reference) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  // Build the payment URL
  const callbackUrl = callback || CALLBACK_URL;
  const paymentUrl = `${LIPIA_URL}?amount=${amount}&reference=${reference}&callback=${encodeURIComponent(callbackUrl)}`;

  res.status(200).json({ paymentUrl });
};
