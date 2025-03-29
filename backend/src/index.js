require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const db = require('./db');
const { initializeTables } = require('./db/migration');

// Import routes
const authRoutes = require('./routes/auth');
const paymentsRoutes = require('./routes/payments');
const userWordsRoutes = require('./routes/userWords');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Advanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin in development, or specific origins in production
    const allowedOrigins = [
      // Frontend origins
      'https://version-1-frontend-production.up.railway.app',
      'https://version-1---frontend-production.up.railway.app',
      // Allow localhost for development
      'http://localhost:3000',
      'http://localhost:5000',
      // Allow null origin (for local file requests, etc.)
      undefined,
      'null'
    ];
    
    // In development allow all origins
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    // In production, check against allowed list
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions)); // Apply CORS with options
app.use(helmet({
  // Allow cross-origin for Railway and other platforms
  crossOriginResourcePolicy: { policy: 'cross-origin' }
})); 
app.use(morgan('dev')); // Logging
app.use(express.json()); // JSON body parser

// Route prefix
const API_PREFIX = '/api/v1';

// Health check endpoint - must be registered before other routes
// to ensure it works even if other routes have errors
app.get('/health', (req, res) => {
  const healthy = db.hasConnection;
  const status = healthy ? 'healthy' : 'degraded';
  const statusCode = 200; // Always return 200 for health checks

  res.status(statusCode).json({
    status: status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: {
        status: db.hasConnection ? 'connected' : 'disconnected',
        message: db.hasConnection ? 'PostgreSQL connected' : 'PostgreSQL connection failed',
        env: {
          DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
          DATABASE_PUBLIC_URL_EXISTS: !!process.env.DATABASE_PUBLIC_URL,
          POSTGRES_URL_EXISTS: !!process.env.POSTGRES_URL
        }
      }
    }
  });
});

// Database health check with more details
app.get('/health/db', async (req, res) => {
  try {
    // First check if we have a connection
    if (!db.hasConnection) {
      return res.status(200).json({
        status: 'error',
        message: 'Database connection is not available',
        timestamp: new Date().toISOString(),
        database: {
          connected: false
        }
      });
    }
    
    // Try to run a test query
    const result = await db.query('SELECT NOW() as time, current_database() as database');
    
    // Get table information if available
    let tables = [];
    try {
      const tablesResult = await db.query(`
        SELECT table_name, 
              (SELECT count(*) FROM information_schema.columns WHERE table_name=t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema='public'
        ORDER BY table_name
      `);
      
      // Get row counts
      for (const table of tablesResult.rows) {
        const countResult = await db.query(`SELECT count(*) FROM "${table.table_name}"`);
        tables.push({
          name: table.table_name,
          columns: parseInt(table.column_count),
          rows: parseInt(countResult.rows[0].count)
        });
      }
    } catch (tableError) {
      console.error('Error getting table information:', tableError);
    }
    
    res.status(200).json({
      status: 'healthy',
      message: 'Database connection is available',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: result.rows[0].database,
        time: result.rows[0].time,
        tables: tables
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(200).json({
      status: 'error',
      message: 'Database query failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: {
        connected: false
      }
    });
  }
});

// Pre-flight options for CORS
app.options('*', cors(corsOptions));

// Root route - simple dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Andikar Payment Service</title>
      <style>
        body { 
          font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        h1, h2, h3 { color: #2C3E50; }
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .plan {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        .plan:last-child { border-bottom: none; }
        .price { font-weight: bold; color: #3498DB; }
        .words { color: #7F8C8D; }
        .api-list { list-style: none; padding: 0; }
        .api-list li { 
          padding: 10px;
          border-bottom: 1px solid #f1f1f1;
        }
        .api-list li:last-child { border-bottom: none; }
        a { color: #3498DB; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .endpoint { 
          font-family: monospace;
          background: #f1f2f6;
          padding: 3px 6px;
          border-radius: 4px;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-left: 8px;
          background: #e1e8ed;
          color: #657786;
        }
        .get { background: #d4edda; color: #155724; }
        .post { background: #cce5ff; color: #004085; }
        footer { 
          margin-top: 40px;
          text-align: center;
          font-size: 0.9em;
          color: #7F8C8D;
        }
        .status {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }
        .status.online { background-color: #2ecc71; }
        .status.offline { background-color: #e74c3c; }
      </style>
    </head>
    <body>
      <h1>Andikar Payment Service</h1>
      
      <div class="card">
        <h2>Service Status</h2>
        <p>
          <span class="status ${db.hasConnection ? 'online' : 'offline'}"></span>
          Service is ${db.hasConnection ? 'up and running' : 'running with database issues'}.
        </p>
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
        <h3>System</h3>
        <ul class="api-list">
          <li><span class="endpoint">/health</span> <span class="badge get">GET</span> - Basic health check</li>
          <li><span class="endpoint">/health/db</span> <span class="badge get">GET</span> - Database connectivity check</li>
        </ul>
        
        <h3>Authentication</h3>
        <ul class="api-list">
          <li><span class="endpoint">${API_PREFIX}/auth/register</span> <span class="badge post">POST</span> - Register a new user</li>
          <li><span class="endpoint">${API_PREFIX}/auth/login</span> <span class="badge post">POST</span> - Login</li>
          <li><span class="endpoint">${API_PREFIX}/auth/verify</span> <span class="badge get">GET</span> - Verify session token</li>
        </ul>
        
        <h3>Payments</h3>
        <ul class="api-list">
          <li><span class="endpoint">${API_PREFIX}/payments/plans</span> <span class="badge get">GET</span> - Get available payment plans</li>
          <li><span class="endpoint">${API_PREFIX}/payments/initiate</span> <span class="badge post">POST</span> - Initiate a payment</li>
          <li><span class="endpoint">${API_PREFIX}/payments/callback</span> <span class="badge post">POST</span> - Payment callback (for Lipia)</li>
          <li><span class="endpoint">${API_PREFIX}/payments/user/history</span> <span class="badge get">GET</span> - Get payment history</li>
          <li><span class="endpoint">${API_PREFIX}/payments/url</span> <span class="badge get">GET</span> - Get payment URL</li>
        </ul>
        
        <h3>Word Balance</h3>
        <ul class="api-list">
          <li><span class="endpoint">${API_PREFIX}/words/balance</span> <span class="badge get">GET</span> - Get word balance</li>
          <li><span class="endpoint">${API_PREFIX}/words/check/:requiredWords</span> <span class="badge get">GET</span> - Check if user has enough words</li>
          <li><span class="endpoint">${API_PREFIX}/words/use</span> <span class="badge post">POST</span> - Use words from balance</li>
          <li><span class="endpoint">${API_PREFIX}/words/stats</span> <span class="badge get">GET</span> - Get usage statistics</li>
        </ul>
      </div>
      
      <footer>
        &copy; ${new Date().getFullYear()} Andikar AI. All rights reserved.
      </footer>
    </body>
    </html>
  `);
});

// API prefix route
app.get(API_PREFIX, (req, res) => {
  res.json({
    message: 'API v1',
    status: 'online',
    timestamp: new Date().toISOString(),
    database_connected: db.hasConnection,
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      payments: `${API_PREFIX}/payments`,
      words: `${API_PREFIX}/words`
    }
  });
});

// Setup API routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/payments`, paymentsRoutes);
app.use(`${API_PREFIX}/words`, userWordsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status: status,
    timestamp: new Date().toISOString()
  });
});

// Start server
(async () => {
  try {
    // Initialize DB connection
    await db.connect();
    
    // Initialize DB tables if needed
    await initializeTables();
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API base: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`Database Dashboard: http://localhost:${PORT}/health/db`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

// Export for testing
module.exports = app;