-- Create user_words table to track word balances
CREATE TABLE user_words (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  remaining_words INTEGER DEFAULT 0,
  total_words_purchased INTEGER DEFAULT 0,
  total_words_used INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table to track all transactions
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  phone VARCHAR(15) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reference VARCHAR(50),
  checkout_request_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  words_added INTEGER,
  metadata JSONB -- for any additional information
);

-- Create payment_config table to store API keys and configuration
CREATE TABLE payment_config (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(255) NOT NULL,
  environment VARCHAR(20) DEFAULT 'production',
  callback_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_checkout_request_id ON payments(checkout_request_id);
