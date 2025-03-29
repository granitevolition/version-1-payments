const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { initializeDatabase, testConnection } = require('./src/db');
const logger = require('./src/utils/logger');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const wordsRoutes = require('./src/routes/words.routes');
const healthRoutes = require('./src/routes/health.routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Andikar Payment API', 
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check routes - must be registered before other middleware for reliability
app.use('/api/health', healthRoutes);

// Routes that require authentication
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/words', wordsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Start the server
async function startServer() {
  try {
    // Test database connection but don't fail if it doesn't connect
    try {
      const dbConnected = await testConnection();
      
      if (dbConnected) {
        logger.info('Database connected successfully');
        // Initialize database tables
        try {
          await initializeDatabase();
          logger.info('Database tables initialized successfully');
        } catch (dbInitError) {
          logger.error('Database initialization error:', dbInitError);
          logger.warn('Continuing with potentially incomplete database schema');
        }
      } else {
        logger.warn('Failed to connect to database. Continuing without database functionality.');
      }
    } catch (dbError) {
      logger.error('Database connection error:', dbError);
      logger.warn('Continuing server startup without database functionality');
    }
    
    // Start the server regardless of database connection
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Server startup error:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Don't exit the process to keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  // Don't exit the process to keep the server running
});

// Start the server
startServer();
