-- Database schema for Version 1 Payments

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  phone VARCHAR(15) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  words_added INTEGER DEFAULT 0,
  reference VARCHAR(50),
  checkout_request_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  error_message TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create user_words table to track word balances
CREATE TABLE IF NOT EXISTS user_words (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  remaining_words INTEGER DEFAULT 0,
  total_words_purchased INTEGER DEFAULT 0,
  total_words_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_words table
CREATE INDEX IF NOT EXISTS idx_user_words_user_id ON user_words(user_id);

-- Create payment_config table for API keys and settings
CREATE TABLE IF NOT EXISTS payment_config (
  id SERIAL PRIMARY KEY,
  environment VARCHAR(20) DEFAULT 'development', -- development, production
  lipia_url VARCHAR(255),
  callback_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO payment_config (environment, lipia_url, callback_url)
VALUES ('development', 'https://lipia-online.vercel.app/link/andikar', 'http://localhost:5000/api/v1/payments/callback')
ON CONFLICT DO NOTHING;
