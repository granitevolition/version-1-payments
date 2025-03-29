require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool, verifyConnection } = require('./config/db'); 
const routes = require('./routes');
const logger = require('./utils/logger');

// Environment info
console.log('========= SERVER STARTING =========');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`Current directory: ${__dirname}`);
console.log(`Process PID: ${process.pid}`);

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
    env: process.env.NODE_ENV || 'development',
    process_uptime: process.uptime() + ' seconds'
  });
});

// Database health check with detailed info
app.get('/api/health/db', async (req, res) => {
  try {
    // Try to connect to database
    const dbClient = await pool.connect();
    
    try {
      // Run a test query with timeout
      const result = await Promise.race([
        dbClient.query('SELECT NOW() as time, current_database() as database, version() as version'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 5000))
      ]);
      
      // Get active connections count
      const connectionsResult = await dbClient.query('SELECT count(*) FROM pg_stat_activity');
      
      res.status(200).json({
        status: 'success',
        message: 'Database connection successful',
        timestamp: new Date(),
        database: {
          connected: true,
          name: result.rows[0].database,
          time: result.rows[0].time,
          version: result.rows[0].version,
          connections: parseInt(connectionsResult.rows[0].count)
        },
        environment: process.env.NODE_ENV || 'development',
        database_url_configured: !!process.env.DATABASE_URL,
        database_public_url_configured: !!process.env.DATABASE_PUBLIC_URL
      });
    } catch (queryError) {
      res.status(200).json({
        status: 'warning',
        message: 'Connected to database but query failed',
        error: queryError.message,
        timestamp: new Date(),
        database: {
          connected: true,
          query_success: false
        }
      });
    } finally {
      dbClient.release();
    }
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    
    // Provide more specific error information
    let errorType = 'unknown';
    if (error.code === 'ECONNREFUSED') errorType = 'connection_refused';
    else if (error.code === '28P01') errorType = 'authentication_failed';
    else if (error.code === '3D000') errorType = 'database_not_found';
    
    res.status(200).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      error_type: errorType,
      timestamp: new Date(),
      database: {
        connected: false
      },
      environment: process.env.NODE_ENV || 'development',
      database_url_configured: !!process.env.DATABASE_URL,
      database_public_url_configured: !!process.env.DATABASE_PUBLIC_URL
    });
  }
});

// Show table info
app.get('/api/health/tables', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get list of tables
      const tablesResult = await client.query(`
        SELECT table_name, 
               (SELECT count(*) FROM information_schema.columns WHERE table_name=t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema='public'
        ORDER BY table_name
      `);
      
      // Get row counts for each table
      const tables = [];
      for (const table of tablesResult.rows) {
        const countResult = await client.query(`SELECT count(*) FROM "${table.table_name}"`);
        tables.push({
          name: table.table_name,
          columns: parseInt(table.column_count),
          rows: parseInt(countResult.rows[0].count)
        });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Database tables information',
        timestamp: new Date(),
        tables
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error getting table information', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve table information',
      error: error.message
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
        <p><a href="/api/health/tables">/api/health/tables</a> - Database tables information</p>
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
  console.log(`Server started on port ${PORT}`);
  logger.info(`Payment service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Verify database connection after server starts
  verifyConnection()
    .then(success => {
      if (success) {
        console.log('✅ Database verified and connected successfully!');
      } else {
        console.log('⚠️ Database connection verification failed');
      }
    })
    .catch(err => {
      console.error('❌ Error verifying database connection:', err.message);
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
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('Uncaught Exception:', err);
  // Don't crash in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

module.exports = app; // For testing