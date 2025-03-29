const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create database connection function with retry logic
function createDatabaseConnection() {
  try {
    // Determine which database URL to use
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

    if (!dbUrl) {
      logger.warn('No database URL found in environment variables!');
      logger.warn('Please set DATABASE_URL or DATABASE_PUBLIC_URL');
      // Return null instead of exiting to allow service to start without DB
      return null;
    }

    // Log the environment
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Create a new Pool instance
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Add some connection pool settings
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000, // How long a client is idle before closed
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
    });

    // Add error handler to the pool
    pool.on('error', (err, client) => {
      logger.error('Unexpected database pool error:', err);
      // Do not exit process on connection errors
    });

    return pool;
  } catch (error) {
    logger.error('Error creating database connection pool:', error);
    // Return null instead of exiting to allow service to start without DB
    return null;
  }
}

// Create the pool
const pool = createDatabaseConnection();

// Test database connection
async function testConnection() {
  if (!pool) {
    logger.warn('No database pool available to test connection');
    return false;
  }
  
  try {
    const client = await pool.connect();
    logger.info('Database connection established successfully');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  if (!pool) {
    logger.warn('No database pool available to initialize database');
    return false;
  }
  
  let client;
  try {
    client = await pool.connect();
    logger.info('Creating database tables if they do not exist...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        plan_name VARCHAR(50) NOT NULL,
        word_count INTEGER NOT NULL,
        reference VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_words table to track word balance
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_words (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_purchased INTEGER DEFAULT 0,
        words_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('Database tables created successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing database:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Create a query function that handles potential connection issues
async function query(text, params) {
  if (!pool) {
    logger.error('Database query attempted but no pool is available');
    throw new Error('Database connection not available');
  }
  
  logger.debug('Executing query:', { text, params });
  try {
    return await pool.query(text, params);
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  query,
  pool,
  testConnection,
  initializeDatabase
};
