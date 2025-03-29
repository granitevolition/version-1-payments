require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool, initDatabase } = require('./config/db');
const routes = require('./routes');
const logger = require('./utils/logger');

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request body
app.use(morgan('dev')); // HTTP request logger

// Simple health check that doesn't depend on database
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Payment service is running',
    timestamp: new Date()
  });
});

// More thorough health check with DB connection
app.get('/api/health/db', async (req, res) => {
  try {
    // Try to connect to database
    const dbClient = await pool.connect();
    await dbClient.query('SELECT NOW()');
    dbClient.release();
    
    res.status(200).json({
      status: 'success',
      message: 'Payment service is running with database connection',
      timestamp: new Date(),
      database: 'connected'
    });
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(200).json({
      status: 'warning',
      message: 'Service is running but database connection failed',
      error: error.message,
      timestamp: new Date(),
      database: 'disconnected'
    });
  }
});

// API routes
app.use('/api/v1', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.stack
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `${req.originalUrl} not found`
  });
});

// Start the server and initialize database
const PORT = process.env.PORT || 8080;

// Start server before database initialization to ensure health checks work
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Payment service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database after server is started
  initDatabase()
    .then(() => {
      logger.info('Database initialization completed');
    })
    .catch(err => {
      logger.error('Database initialization failed, but server is still running', { 
        error: err.message 
      });
    });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  // Don't crash in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  // Don't crash in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

module.exports = app; // For testing