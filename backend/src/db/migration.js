/**
 * Database migrations for payment system
 */
const db = require('./index');

/**
 * Initialize database tables
 */
const initializeTables = async () => {
  try {
    console.log('Initializing database tables...');
    
    // Check if tables exist first
    const tablesExist = await checkTablesExist();
    
    if (tablesExist) {
      console.log('Tables already exist, checking for missing columns...');
      await addMissingColumns();
      return;
    }
    
    // Create tables
    await db.query(`
      -- Users table for authentication
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        tier VARCHAR(20) DEFAULT 'free',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      
      -- Create user_sessions table for handling login sessions
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
      
      -- Create payments table for payment tracking
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        words_added INTEGER NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reference VARCHAR(255),
        checkout_request_id VARCHAR(255),
        payment_date TIMESTAMP WITH TIME ZONE,
        callback_received BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
      
      -- Create word balance table
      CREATE TABLE IF NOT EXISTS user_words (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        remaining_words INTEGER NOT NULL DEFAULT 0,
        total_words_purchased INTEGER NOT NULL DEFAULT 0,
        total_words_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_words_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_words_user_id ON user_words(user_id);
      
      -- Create payment callbacks table for auditing
      CREATE TABLE IF NOT EXISTS payment_callbacks (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(255),
        checkout_request_id VARCHAR(255),
        payment_id INTEGER,
        payload JSONB,
        status VARCHAR(20),
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_callbacks_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_payment_callbacks_reference ON payment_callbacks(reference);
      CREATE INDEX IF NOT EXISTS idx_payment_callbacks_payment_id ON payment_callbacks(payment_id);
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

/**
 * Check if the required tables already exist
 */
const checkTablesExist = async () => {
  try {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking if tables exist:', error);
    return false;
  }
};

/**
 * Check if a specific table exists
 */
const checkTableExists = async (tableName) => {
  try {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if ${tableName} table exists:`, error);
    return false;
  }
};

/**
 * Add any missing columns to existing tables
 */
const addMissingColumns = async () => {
  try {
    // Update users table if needed
    const userTableExists = await checkTableExists('users');
    if (userTableExists) {
      const userColumns = await getTableColumns('users');
      
      // Add tier column if needed
      if (!userColumns.includes('tier')) {
        console.log('Adding tier column to users table');
        await db.query(`
          ALTER TABLE users
          ADD COLUMN tier VARCHAR(20) DEFAULT 'free';
        `);
      }
    }
    
    // Check for payments table
    const paymentsTableExists = await checkTableExists('payments');
    if (!paymentsTableExists) {
      console.log('Creating payments table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount NUMERIC(10, 2) NOT NULL,
          words_added INTEGER NOT NULL,
          phone VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          reference VARCHAR(255),
          checkout_request_id VARCHAR(255),
          payment_date TIMESTAMP WITH TIME ZONE,
          callback_received BOOLEAN DEFAULT FALSE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
      `);
    }
    
    // Check for user_words table
    const userWordsTableExists = await checkTableExists('user_words');
    if (!userWordsTableExists) {
      console.log('Creating user_words table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_words (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL,
          remaining_words INTEGER NOT NULL DEFAULT 0,
          total_words_purchased INTEGER NOT NULL DEFAULT 0,
          total_words_used INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_words_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_words_user_id ON user_words(user_id);
      `);
    }
    
    // Check for payment_callbacks table
    const callbacksTableExists = await checkTableExists('payment_callbacks');
    if (!callbacksTableExists) {
      console.log('Creating payment_callbacks table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS payment_callbacks (
          id SERIAL PRIMARY KEY,
          reference VARCHAR(255),
          checkout_request_id VARCHAR(255),
          payment_id INTEGER,
          payload JSONB,
          status VARCHAR(20),
          processed BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_callbacks_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_payment_callbacks_reference ON payment_callbacks(reference);
        CREATE INDEX IF NOT EXISTS idx_payment_callbacks_payment_id ON payment_callbacks(payment_id);
      `);
    }
    
    console.log('Table migration completed successfully');
  } catch (error) {
    console.error('Error during column migration:', error);
    throw error;
  }
};

/**
 * Get the column names for a table
 * @param {string} tableName - Name of the table
 * @returns {Promise<string[]>} - Array of column names
 */
const getTableColumns = async (tableName) => {
  const result = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1;
  `, [tableName]);
  
  return result.rows.map(row => row.column_name);
};

module.exports = {
  initializeTables,
  checkTableExists,
  getTableColumns
};