const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * Database connection configuration
 * Uses Railway's automatically-provided PostgreSQL connection variables
 */
const pool = new Pool({
  // The DATABASE_URL is automatically provided by Railway
  // If not available, we build the connection string from individual params
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  
  // If individual connection parameters are provided, use those as fallback
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
  port: process.env.PGPORT || 5432,
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // SSL settings (required for Railway)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to PostgreSQL database', { error: err.message });
    return;
  }
  
  logger.info('Successfully connected to PostgreSQL database');
  
  // Check if tables exist, create them if they don't
  initializeDatabase(client)
    .then(() => {
      logger.info('Database schema initialized successfully');
      release();
    })
    .catch(error => {
      logger.error('Error initializing database schema', { error: error.message });
      release();
    });
});

/**
 * Initialize database schema if tables don't exist
 * @param {Object} client - PostgreSQL client
 */
async function initializeDatabase(client) {
  try {
    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        words_added INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reference VARCHAR(255),
        checkout_request_id VARCHAR(255),
        payment_date TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_words table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_words (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        remaining_words INTEGER NOT NULL DEFAULT 0,
        total_words_purchased INTEGER NOT NULL DEFAULT 0,
        total_words_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create payment_callbacks table for auditing
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_callbacks (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(255),
        checkout_request_id VARCHAR(255),
        payload JSONB,
        status VARCHAR(20),
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    return true;
  } catch (error) {
    logger.error('Error creating database tables', { error: error.message });
    throw error;
  }
}

/**
 * Execute a database query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { 
      query: text, 
      duration, 
      rows: result.rowCount 
    });
    
    return result;
  } catch (error) {
    logger.error('Error executing query', { 
      query: text, 
      error: error.message 
    });
    
    throw error;
  }
};

module.exports = {
  query,
  pool
};
