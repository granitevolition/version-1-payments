require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool } = require('./config/db'); // Import the pool directly
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
    timestamp: new Date(),
    env: process.env.NODE_ENV || 'development'
  });
});

// More thorough health check with DB connection
app.get('/api/health/db', async (req, res) => {
  try {
    // Try to connect to database
    const dbClient = await pool.connect();
    const result = await dbClient.query('SELECT NOW()');
    dbClient.release();
    
    res.status(200).json({
      status: 'success',
      message: 'Payment service is running with database connection',
      timestamp: new Date(),
      database: 'connected',
      database_time: result.rows[0].now
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

// Serve static frontend files for development
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('public'));
}

// API routes
app.use('/api/v1', routes);

// Homepage route to serve a basic dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Andikar Payment Service</title>
      <style>
        body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2C3E50; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .plan { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 10px 0; }
        .plan:last-child { border-bottom: none; }
        .price { font-weight: bold; color: #3498DB; }
        .words { color: #7F8C8D; }
        a { color: #3498DB; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { margin-top: 40px; text-align: center; font-size: 0.9em; color: #7F8C8D; }
      </style>
    </head>
    <body>
      <h1>Andikar Payment Service</h1>
      <div class="card">
        <h2>Service Status</h2>
        <p>Service is up and running.</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Server Time: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="card">
        <h2>Available Payment Plans</h2>
        <div class="plan">
          <div>
            <strong>Basic Plan</strong>
            <div class="words">30,000 words</div>
          </div>
          <div class="price">KES 1,500</div>
        </div>
        <div class="plan">
          <div>
            <strong>Standard Plan</strong>
            <div class="words">60,000 words</div>
          </div>
          <div class="price">KES 2,500</div>
        </div>
        <div class="plan">
          <div>
            <strong>Premium Plan</strong>
            <div class="words">100,000 words</div>
          </div>
          <div class="price">KES 4,000</div>
        </div>
      </div>
      
      <div class="card">
        <h2>API Endpoints</h2>
        <p><a href="/api/health">/api/health</a> - Basic health check</p>
        <p><a href="/api/health/db">/api/health/db</a> - Database connectivity check</p>
        <p><a href="/api/v1/payments/url">/api/v1/payments/url</a> - Payment gateway URL</p>
      </div>
      
      <footer>
        &copy; ${new Date().getFullYear()} Andikar AI. All rights reserved.
      </footer>
    </body>
    </html>
  `);
});

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

// Start the server
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Payment service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log database connection string (masked)
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || 'Not configured';
  const maskedUrl = dbUrl === 'Not configured' ? dbUrl : dbUrl.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
  logger.info(`Database URL: ${maskedUrl}`);
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