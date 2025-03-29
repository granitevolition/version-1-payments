const { Pool } = require('pg');
const logger = require('../utils/logger');

// Determine which database URL to use
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  logger.error('No database URL found in environment variables!');
  logger.error('Please set DATABASE_URL or DATABASE_PUBLIC_URL');
  process.exit(1);
}

// Create a new Pool instance
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    logger.info('Database connection established successfully');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
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
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Create a query function that logs queries for debugging
function query(text, params) {
  logger.debug('Executing query:', { text, params });
  return pool.query(text, params);
}

module.exports = {
  query,
  pool,
  testConnection,
  initializeDatabase
};
