/**
 * Database migration script
 * Run with: node scripts/migrate.js
 */
require('dotenv').config();
const { Pool } = require('pg');

console.log('========= DATABASE MIGRATION =========');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Determine the connection string to use
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
console.log(`Database connection: ${connectionString ? 'Using connection string' : 'Using individual parameters'}`);

// Create database configuration
const dbConfig = connectionString 
  ? { connectionString } 
  : {
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
      port: process.env.PGPORT || 5432,
    };

// Add SSL configuration for production
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = { rejectUnauthorized: false };
  console.log('SSL enabled for database connection');
}

// Create the pool
const pool = new Pool(dbConfig);

// Migration function
async function runMigration() {
  let client;
  
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected to database! 🎉');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`Database time: ${result.rows[0].current_time}`);
    
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Creating tables...');
    
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
    
    // Create indexes
    console.log('Creating indexes...');
    
    // Payments table indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    
    // Payment callbacks table indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_callbacks_reference ON payment_callbacks(reference)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_callbacks_checkout_request_id ON payment_callbacks(checkout_request_id)');
    
    console.log('- Indexes created');
    
    // Sample data (if needed)
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DATA === 'true') {
      console.log('Adding sample data...');
      
      // Sample user words
      await client.query(`
        INSERT INTO user_words (user_id, remaining_words, total_words_purchased, total_words_used)
        VALUES ('demo-user-1', 50000, 80000, 30000)
        ON CONFLICT (user_id) DO NOTHING
      `);
      
      // Sample payments
      await client.query(`
        INSERT INTO payments (user_id, phone, amount, words_added, status, reference, payment_date)
        VALUES 
          ('demo-user-1', '0712345678', 1500, 30000, 'completed', 'sample-ref-1', NOW() - INTERVAL '10 days'),
          ('demo-user-1', '0712345678', 2500, 50000, 'completed', 'sample-ref-2', NOW() - INTERVAL '5 days')
        ON CONFLICT DO NOTHING
      `);
      
      console.log('- Sample data added');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Database info
    console.log('\nDatabase schema information:');
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name=t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema='public'
      ORDER BY table_name
    `);
    
    for (const table of tablesResult.rows) {
      const countResult = await client.query(`SELECT count(*) FROM "${table.table_name}"`);
      console.log(`- ${table.table_name}: ${table.column_count} columns, ${countResult.rows[0].count} rows`);
    }
    
    console.log('\nMigration completed successfully! 🎉');
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Migration failed:', error.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    
    // Close pool
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(success => {
    if (success) {
      console.log('Migration successful!');
      process.exit(0);
    } else {
      console.error('Migration failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error during migration:', err);
    process.exit(1);
  });