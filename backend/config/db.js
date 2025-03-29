const { Pool } = require('pg');
const logger = require('../utils/logger');

// Log database connection parameters (with sensitive info masked)
console.log('Database connection configuration:');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Defined ✓' : 'MISSING ⚠️'}`);
console.log(`DATABASE_PUBLIC_URL: ${process.env.DATABASE_PUBLIC_URL ? 'Defined ✓' : 'MISSING ⚠️'}`);
console.log(`PGDATABASE: ${process.env.PGDATABASE || '(not set)'}`);
console.log(`PGHOST: ${process.env.PGHOST || '(not set)'}`);
console.log(`PGUSER: ${process.env.PGUSER ? 'Defined ✓' : '(not set)'}`);
console.log(`PGPASSWORD: ${process.env.PGPASSWORD ? 'Defined ✓' : '(not set)'}`);
console.log(`PGPORT: ${process.env.PGPORT || '5432 (default)'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Determine the connection string to use
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
if (!connectionString) {
  console.warn('WARNING: No DATABASE_URL or DATABASE_PUBLIC_URL defined');
  console.warn('Will attempt to use individual connection parameters instead');
}

// Create database configuration
const dbConfig = connectionString 
  ? { connectionString } // Use connection string if available
  : {
      // Otherwise try individual parameters with defaults
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
      port: process.env.PGPORT || 5432,
    };

// Add SSL configuration for production
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = { rejectUnauthorized: false };
  console.log('SSL enabled for database connection in production');
}

// Add pool configuration
dbConfig.max = 20;
dbConfig.idleTimeoutMillis = 30000;
dbConfig.connectionTimeoutMillis = 5000;

// Create the pool
const pool = new Pool(dbConfig);

// Log pool events for debugging
pool.on('connect', () => {
  console.log('New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Verify database connection immediately
async function verifyConnection() {
  let client;
  try {
    console.log('Attempting database connection...');
    client = await pool.connect();
    console.log('Database connection successful! 🎉');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`Database time: ${result.rows[0].current_time}`);
    
    // Try to create tables immediately
    await initializeDatabase(client);
    return true;
  } catch (err) {
    console.error('ERROR: Database connection failed!');
    console.error(`Error message: ${err.message}`);
    
    // More detailed error information
    if (err.code === 'ECONNREFUSED') {
      console.error('Could not connect to PostgreSQL server. Please check if the database server is running and the connection parameters are correct.');
    } else if (err.code === '28P01') {
      console.error('Authentication failed. Please check username and password.');
    } else if (err.code === '3D000') {
      console.error('Database does not exist. Please create the database first.');
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Initialize database schema if tables don't exist
 * @param {Object} client - PostgreSQL client
 */
async function initializeDatabase(client) {
  try {
    console.log('Initializing database schema...');
    
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
    console.log('- payments table ready');
    
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
    console.log('- user_words table ready');
    
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
    console.log('- payment_callbacks table ready');
    
    console.log('Database schema initialization complete! 🎉');
    
    // Check if tables have any data
    const paymentCount = await client.query('SELECT COUNT(*) FROM payments');
    const userWordsCount = await client.query('SELECT COUNT(*) FROM user_words');
    console.log(`Database statistics: ${paymentCount.rows[0].count} payments, ${userWordsCount.rows[0].count} user word records`);
    
    return true;
  } catch (error) {
    console.error('Error creating database tables:', error.message);
    throw error;
  }
}

// Try connection immediately
verifyConnection()
  .then(success => {
    if (success) {
      logger.info('Database connected and initialized successfully on startup');
    } else {
      logger.error('Database connection failed on startup');
    }
  })
  .catch(err => {
    logger.error('Error during database initialization:', { error: err.message });
  });

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
  pool,
  verifyConnection,
  initializeDatabase
};