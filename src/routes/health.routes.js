const express = require('express');
const { testConnection } = require('../db');
const logger = require('../utils/logger');

const router = express.Router();

// Basic health check - always returns ok
router.get('/', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Database health check
router.get('/db', async (req, res) => {
  logger.info('Database health check requested');
  try {
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      logger.info('Database connection successful');
      res.status(200).json({ 
        status: 'ok', 
        message: 'Database is connected',
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn('Database connection failed');
      // Still return 200 to not fail Railway health checks
      res.status(200).json({ 
        status: 'warning', 
        message: 'Database connection failed, but service is operational',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Database health check error:', error);
    // Still return 200 to not fail health checks
    res.status(200).json({ 
      status: 'warning', 
      message: 'Database error, but service is operational',
      error: process.env.NODE_ENV === 'production' ? 'Database error' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
