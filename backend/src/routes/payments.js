const express = require('express');
const router = express.Router();
const db = require('../db');
const { checkTableExists } = require('../db/migration');
const axios = require('axios');

// Middleware to verify user is authenticated
const authenticate = async (req, res, next) => {
  // Skip authentication for callback endpoint
  if (req.path === '/callback') {
    return next();
  }
  
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if session exists and is valid
    const sessionResult = await db.query(`
      SELECT s.user_id, s.expires_at, u.username, u.email
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.expires_at > NOW()
    `, [token]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    
    // Add user to request object
    req.user = {
      id: sessionResult.rows[0].user_id,
      username: sessionResult.rows[0].username,
      email: sessionResult.rows[0].email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Authentication failed'
    });
  }
};

// Get the Lipia payment URL
const getLipiaUrl = () => {
  return process.env.LIPIA_URL || 'https://lipia-online.vercel.app/link/andikar';
};

// Payment plans
const PAYMENT_PLANS = {
  'basic': { amount: 1500, words: 30000 },
  'standard': { amount: 2500, words: 60000 },
  'premium': { amount: 4000, words: 100000 }
};

// Get payment plan by amount
const getPaymentPlanByAmount = (amount) => {
  const numericAmount = Number(amount);
  
  for (const [key, plan] of Object.entries(PAYMENT_PLANS)) {
    if (plan.amount === numericAmount) {
      return { ...plan, name: key };
    }
  }
  
  return null;
};

// Initiate a payment
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { plan, phone, customAmount } = req.body;
    
    // Validate payment plan or custom amount
    let amount, wordsToAdd;
    
    if (plan && PAYMENT_PLANS[plan]) {
      // Use predefined plan
      amount = PAYMENT_PLANS[plan].amount;
      wordsToAdd = PAYMENT_PLANS[plan].words;
    } else if (customAmount) {
      // Use custom amount (convert to number)
      amount = Number(customAmount);
      
      // Look up if this matches a predefined plan
      const matchedPlan = getPaymentPlanByAmount(amount);
      if (matchedPlan) {
        wordsToAdd = matchedPlan.words;
      } else {
        // Calculate words based on 20 words per KES as a default rate
        // This allows flexible amounts while still providing a reasonable word count
        wordsToAdd = Math.floor(amount * 20);
      }
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either plan or customAmount must be provided'
      });
    }
    
    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone number is required'
      });
    }
    
    // Format phone number (if needed)
    const formattedPhone = formatPhoneNumber(phone);
    
    try {
      // Create payment record
      const paymentResult = await db.query(`
        INSERT INTO payments (
          user_id, amount, words_added, phone, status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, amount, words_added, status, created_at
      `, [req.user.id, amount, wordsToAdd, formattedPhone, 'pending']);
      
      const payment = paymentResult.rows[0];
      
      // Get Lipia URL for redirection
      const lipiaUrl = getLipiaUrl();
      
      // Construct callback URL (for Lipia to call when payment is complete)
      // This should be publicly accessible
      const callbackUrl = process.env.CALLBACK_URL || 
                          `${req.protocol}://${req.get('host')}/api/v1/payments/callback`;
      
      res.status(200).json({
        message: 'Payment initiated successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          words: payment.words_added,
          status: payment.status,
          created_at: payment.created_at
        },
        redirect: {
          url: lipiaUrl,
          phone: formattedPhone,
          amount: amount,
          callback: callbackUrl
        }
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to initiate payment. Please try again later.'
    });
  }
});

// Callback endpoint for Lipia to notify about payment status
router.post('/callback', async (req, res) => {
  console.log('Payment callback received:', req.body);
  
  try {
    // Extract data from callback
    const { reference, CheckoutRequestID, status, phone, amount } = req.body;
    
    // Validate callback data
    if (!reference && !CheckoutRequestID) {
      console.error('Invalid callback - missing reference and CheckoutRequestID');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing reference or CheckoutRequestID'
      });
    }
    
    // Store callback in database for auditing
    try {
      await db.query(`
        INSERT INTO payment_callbacks (
          reference, checkout_request_id, payload, status
        )
        VALUES ($1, $2, $3, $4)
      `, [
        reference || null,
        CheckoutRequestID || null,
        JSON.stringify(req.body),
        status || 'unknown'
      ]);
    } catch (callbackError) {
      console.error('Failed to store callback data:', callbackError);
      // Continue processing even if we can't store the callback
    }
    
    // Try to find payment with matching reference
    let paymentResult;
    let userId, paymentId, wordsToAdd;
    
    // First try to match with reference
    if (reference) {
      paymentResult = await db.query(`
        UPDATE payments
        SET reference = $1,
            status = CASE WHEN $2 = 'success' THEN 'completed' ELSE 'failed' END,
            callback_received = true,
            payment_date = CASE WHEN $2 = 'success' THEN NOW() ELSE payment_date END,
            updated_at = NOW()
        WHERE reference = $1 OR id = $1
        RETURNING id, user_id, amount, words_added, status
      `, [reference, status || 'unknown']);
    }
    
    // If not found, try to match with CheckoutRequestID
    if ((!paymentResult || paymentResult.rows.length === 0) && CheckoutRequestID) {
      paymentResult = await db.query(`
        UPDATE payments
        SET checkout_request_id = $1,
            status = CASE WHEN $2 = 'success' THEN 'completed' ELSE 'failed' END,
            callback_received = true,
            payment_date = CASE WHEN $2 = 'success' THEN NOW() ELSE payment_date END,
            updated_at = NOW()
        WHERE checkout_request_id = $1
        RETURNING id, user_id, amount, words_added, status
      `, [CheckoutRequestID, status || 'unknown']);
    }
    
    // If we still couldn't find the payment, try to find by phone and amount
    if ((!paymentResult || paymentResult.rows.length === 0) && phone && amount) {
      paymentResult = await db.query(`
        SELECT id, user_id, amount, words_added, status
        FROM payments
        WHERE phone = $1 AND amount = $2 AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `, [phone, amount]);
      
      if (paymentResult.rows.length > 0) {
        const paymentToUpdate = paymentResult.rows[0];
        
        // Update the matching payment
        await db.query(`
          UPDATE payments
          SET reference = $1,
              checkout_request_id = $2,
              status = CASE WHEN $3 = 'success' THEN 'completed' ELSE 'failed' END,
              callback_received = true,
              payment_date = CASE WHEN $3 = 'success' THEN NOW() ELSE payment_date END,
              updated_at = NOW()
          WHERE id = $4
        `, [reference, CheckoutRequestID, status || 'unknown', paymentToUpdate.id]);
      }
    }
    
    // If still no payment found, log the issue but return success
    if (!paymentResult || paymentResult.rows.length === 0) {
      console.warn('Payment not found for callback:', { reference, CheckoutRequestID, phone, amount });
      return res.status(200).json({
        message: 'Callback received, but payment not found',
        success: true
      });
    }
    
    const payment = paymentResult.rows[0];
    userId = payment.user_id;
    paymentId = payment.id;
    wordsToAdd = payment.words_added;
    
    // Update payment_callbacks with the payment_id if possible
    if (paymentId) {
      try {
        await db.query(`
          UPDATE payment_callbacks
          SET payment_id = $1, processed = true
          WHERE reference = $2 OR checkout_request_id = $3
        `, [paymentId, reference || null, CheckoutRequestID || null]);
      } catch (updateError) {
        console.error('Failed to update callback record:', updateError);
      }
    }
    
    // If payment is successful, update user's word balance
    if (status === 'success' && userId && wordsToAdd > 0) {
      try {
        // Check if user has a word balance record
        const balanceResult = await db.query(`
          SELECT id FROM user_words WHERE user_id = $1
        `, [userId]);
        
        if (balanceResult.rows.length > 0) {
          // Update existing balance
          await db.query(`
            UPDATE user_words
            SET remaining_words = remaining_words + $1,
                total_words_purchased = total_words_purchased + $1,
                updated_at = NOW()
            WHERE user_id = $2
          `, [wordsToAdd, userId]);
        } else {
          // Create new balance record
          await db.query(`
            INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
            VALUES ($1, $2, $3, 0)
          `, [userId, wordsToAdd, wordsToAdd]);
        }
        
        console.log(`Added ${wordsToAdd} words to user ${userId}`);
      } catch (wordError) {
        console.error('Failed to update user word balance:', wordError);
      }
    }
    
    res.status(200).json({
      message: 'Callback processed successfully',
      success: true
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to process callback',
      success: false
    });
  }
});

// Get payment status
router.get('/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const paymentResult = await db.query(`
      SELECT id, user_id, amount, words_added, phone, status, reference, 
             checkout_request_id, payment_date, created_at, updated_at
      FROM payments
      WHERE id = $1 AND user_id = $2
    `, [paymentId, req.user.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      payment: paymentResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch payment'
    });
  }
});

// Get user's payment history
router.get('/user/history', authenticate, async (req, res) => {
  try {
    const paymentResult = await db.query(`
      SELECT id, amount, words_added, phone, status, reference, 
             payment_date, created_at, updated_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.status(200).json({
      payments: paymentResult.rows
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch payment history'
    });
  }
});

// Get payment plans
router.get('/plans', (req, res) => {
  const formattedPlans = Object.entries(PAYMENT_PLANS).map(([name, details]) => ({
    name,
    amount: details.amount,
    words: details.words
  }));
  
  res.status(200).json({
    plans: formattedPlans
  });
});

// Get Lipia payment URL
router.get('/url', (req, res) => {
  res.status(200).json({
    url: getLipiaUrl()
  });
});

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Ensure it starts with '07'
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
};

module.exports = router;