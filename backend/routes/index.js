const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import routes (with error handling if any don't exist)
try {
  // Basic health check route that doesn't require other modules
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'API routes are working',
      timestamp: new Date()
    });
  });

  // Try to load payment routes
  try {
    const paymentRoutes = require('./paymentRoutes');
    router.use('/payments', paymentRoutes);
    logger.info('Payment routes loaded');
  } catch (error) {
    logger.warn('Payment routes could not be loaded', { error: error.message });
    router.use('/payments', (req, res) => {
      res.status(503).json({
        status: 'error',
        message: 'Payment routes are currently unavailable',
        error: 'Module not loaded'
      });
    });
  }

  // Try to load user word routes
  try {
    const userWordsRoutes = require('./userWordsRoutes');
    router.use('/words', userWordsRoutes);
    logger.info('User words routes loaded');
  } catch (error) {
    logger.warn('User words routes could not be loaded', { error: error.message });
    router.use('/words', (req, res) => {
      res.status(503).json({
        status: 'error',
        message: 'Word tracking routes are currently unavailable',
        error: 'Module not loaded'
      });
    });
  }

} catch (error) {
  logger.error('Error setting up API routes', { error: error.message });
  // Provide a fallback route that won't crash the server
  router.use('*', (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'API is currently unavailable',
      error: 'Internal configuration error'
    });
  });
}

module.exports = router;
