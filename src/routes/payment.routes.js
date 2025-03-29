const express = require('express');
const { 
  getPlans, 
  initiatePayment, 
  paymentCallback,
  checkPaymentStatus,
  getUserPayments,
  getPaymentUrl
} = require('../controllers/payment.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Get payment plans
router.get('/plans', getPlans);

// Initiate payment (protected route)
router.post('/initiate', auth, initiatePayment);

// Payment callback (public endpoint for Lipia to call)
router.get('/callback', paymentCallback);

// Check payment status
router.get('/status/:reference', checkPaymentStatus);

// Get user's payment history (protected route)
router.get('/user', auth, getUserPayments);

// Get payment URL for frontend
router.get('/url', getPaymentUrl);

module.exports = router;
