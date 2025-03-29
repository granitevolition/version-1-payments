const { Pool } = require('pg');
const logger = require('../utils/logger');

// Use the DATABASE_PUBLIC_URL for Railway's deployment, or fallback to DATABASE_URL or a local DB
const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/payments';

// Create a new pool with a connectionTimeoutMillis to prevent hanging
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000, // 5 seconds
  statement_timeout: 10000, // 10 seconds
  max: 20,
  idleTimeoutMillis: 30000, // 30 seconds
  allowExitOnIdle: true
});

// Log the database connection attempt - not actual credentials
logger.info(`Attempting to connect to database${process.env.NODE_ENV === 'production' ? ' in production' : ''}`);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
  // Don't crash the application for connection issues
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Database error might affect application performance');
  }
});

// Initialize database with required tables if they don't exist
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    logger.info('Initializing database schema...');
    
    // Create payments table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        phone VARCHAR(15) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        words_added INTEGER DEFAULT 0,
        reference VARCHAR(50),
        checkout_request_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        payment_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    
    // Create indexes for payments table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference) WHERE reference IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
    `);
    
    // Create user_words table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_words (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        remaining_words INTEGER DEFAULT 0,
        total_words_purchased INTEGER DEFAULT 0,
        total_words_used INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index for user_words table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_words_user_id ON user_words(user_id);
    `);
    
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Error initializing database schema', { error: error.message });
    // In production, we'll continue even if schema initialization fails
    // but in development, it might be better to know right away
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
  } finally {
    client.release();
  }
};

// Export the pool and initialization function
module.exports = {
  pool,
  initDatabase
};
