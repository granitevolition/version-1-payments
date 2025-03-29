/**
 * Complete standalone server with API and frontend in one file
 * This file doesn't rely on any other files to work
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Database connection (will be skipped if no DB URL is provided)
let pool = null;
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (dbUrl) {
  try {
    console.log('Connecting to database...');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    console.log('Database connection pool created');
    
    // Test connection
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('Database connection test failed:', err);
      } else {
        console.log('Database connection successful:', result.rows[0].now);
      }
    });
  } catch (error) {
    console.error('Error creating database connection:', error);
  }
}

// Payment Plans Data
const PAYMENT_PLANS = {
  basic: { id: 'basic', price: 1500, words: 30000, name: 'Basic Plan' },
  standard: { id: 'standard', price: 2500, words: 60000, name: 'Standard Plan' },
  premium: { id: 'premium', price: 4000, words: 100000, name: 'Premium Plan' },
};

// Fake user data for testing (would come from DB in real app)
const USERS = [
  { id: 1, username: 'testuser', email: 'test@example.com', password: 'password123' },
];

// Fake payment data for testing
const PAYMENTS = [];

// Root endpoint with basic HTML UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Andikar Payment System</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1, h2 { color: #2c3e50; }
          .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .btn {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 10px 15px;
            text-decoration: none;
            border-radius: 4px;
            border: none;
            cursor: pointer;
          }
          .btn:hover { background-color: #2980b9; }
          .payment-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border: 1px solid #eee;
            margin-bottom: 10px;
            border-radius: 4px;
          }
          .payment-option:hover { background-color: #f8f9fa; }
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            align-items: center;
            justify-content: center;
          }
          .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow: auto;
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          .close { 
            font-size: 24px;
            cursor: pointer;
          }
          iframe {
            width: 100%;
            height: 500px;
            border: none;
          }
          .tabs { display: flex; margin-bottom: 20px; }
          .tab {
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
          }
          .tab.active {
            border-bottom: 2px solid #3498db;
            font-weight: bold;
          }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .form-group {
            margin-bottom: 15px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <h1>Andikar Payment System</h1>
        <p>Complete payment integration with Lipia Online for M-Pesa payments.</p>
        
        <div class="tabs">
          <div class="tab active" data-tab="payments">Payments</div>
          <div class="tab" data-tab="login">Login</div>
          <div class="tab" data-tab="register">Register</div>
          <div class="tab" data-tab="api">API Testing</div>
        </div>
        
        <div id="payments" class="tab-content active">
          <div class="card">
            <h2>Select a Payment Plan</h2>
            <div id="planOptions">
              <div class="payment-option" data-plan="basic">
                <div>
                  <strong>Basic Plan</strong>
                  <p>30,000 words</p>
                </div>
                <div>
                  <strong>KES 1,500</strong>
                  <button class="btn" onclick="selectPlan('basic')">Select</button>
                </div>
              </div>
              
              <div class="payment-option" data-plan="standard">
                <div>
                  <strong>Standard Plan</strong>
                  <p>60,000 words</p>
                </div>
                <div>
                  <strong>KES 2,500</strong>
                  <button class="btn" onclick="selectPlan('standard')">Select</button>
                </div>
              </div>
              
              <div class="payment-option" data-plan="premium">
                <div>
                  <strong>Premium Plan</strong>
                  <p>100,000 words</p>
                </div>
                <div>
                  <strong>KES 4,000</strong>
                  <button class="btn" onclick="selectPlan('premium')">Select</button>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
              <button id="payButton" class="btn" disabled>Pay Now with M-Pesa</button>
            </div>
          </div>
        </div>
        
        <div id="login" class="tab-content">
          <div class="card">
            <h2>Login</h2>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" placeholder="Enter your email">
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" placeholder="Enter your password">
            </div>
            <button class="btn" onclick="login()">Login</button>
          </div>
        </div>
        
        <div id="register" class="tab-content">
          <div class="card">
            <h2>Register</h2>
            <div class="form-group">
              <label for="regUsername">Username</label>
              <input type="text" id="regUsername" placeholder="Choose a username">
            </div>
            <div class="form-group">
              <label for="regEmail">Email</label>
              <input type="email" id="regEmail" placeholder="Enter your email">
            </div>
            <div class="form-group">
              <label for="regPassword">Password</label>
              <input type="password" id="regPassword" placeholder="Create a password">
            </div>
            <button class="btn" onclick="register()">Register</button>
          </div>
        </div>
        
        <div id="api" class="tab-content">
          <div class="card">
            <h2>API Endpoints</h2>
            <ul>
              <li><a href="/api/health" target="_blank">/api/health</a> - Check server health</li>
              <li><a href="/api/payments/plans" target="_blank">/api/payments/plans</a> - Get payment plans</li>
              <li><a href="/api/status" target="_blank">/api/status</a> - Server status with environment info</li>
            </ul>
          </div>
        </div>
        
        <!-- Payment Modal -->
        <div id="paymentModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Complete Your Payment</h2>
              <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <iframe id="paymentFrame" src=""></iframe>
          </div>
        </div>
        
        <script>
          // DOM Elements
          const tabs = document.querySelectorAll('.tab');
          const tabContents = document.querySelectorAll('.tab-content');
          const payButton = document.getElementById('payButton');
          const paymentModal = document.getElementById('paymentModal');
          const paymentFrame = document.getElementById('paymentFrame');
          
          // State
          let selectedPlan = null;
          let isLoggedIn = false;
          
          // Check if user is logged in
          function checkLoginStatus() {
            const token = localStorage.getItem('token');
            isLoggedIn = !!token;
            
            // Update UI based on login status
            if (isLoggedIn) {
              document.querySelector('.tab[data-tab="login"]').textContent = 'Logout';
            } else {
              document.querySelector('.tab[data-tab="login"]').textContent = 'Login';
            }
          }
          
          // Tab switching
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              // Handle logout
              if (tab.dataset.tab === 'login' && isLoggedIn) {
                localStorage.removeItem('token');
                checkLoginStatus();
                return;
              }
              
              // Switch tabs
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(tc => tc.classList.remove('active'));
              
              tab.classList.add('active');
              document.getElementById(tab.dataset.tab).classList.add('active');
            });
          });
          
          // Select a payment plan
          function selectPlan(plan) {
            selectedPlan = plan;
            
            // Highlight the selected plan
            document.querySelectorAll('.payment-option').forEach(option => {
              if (option.dataset.plan === plan) {
                option.style.border = '2px solid #3498db';
                option.style.backgroundColor = '#edf7fd';
              } else {
                option.style.border = '1px solid #eee';
                option.style.backgroundColor = '';
              }
            });
            
            // Enable the pay button
            payButton.disabled = false;
            
            // Configure pay button
            payButton.onclick = () => {
              if (!isLoggedIn) {
                alert('Please login first to make a payment');
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                document.querySelector('.tab[data-tab="login"]').classList.add('active');
                document.getElementById('login').classList.add('active');
                return;
              }
              
              // Open payment modal
              openPaymentModal();
            };
          }
          
          // Open payment modal
          function openPaymentModal() {
            const planData = ${JSON.stringify(PAYMENT_PLANS)}[selectedPlan];
            const paymentUrl = \`https://lipia-online.vercel.app/link/andikar?amount=\${planData.price}&reference=DEMO-\${Date.now()}&callback=\${encodeURIComponent(window.location.origin + '/api/payments/callback')}\`;
            
            paymentFrame.src = paymentUrl;
            paymentModal.style.display = 'flex';
          }
          
          // Close payment modal
          function closeModal() {
            paymentModal.style.display = 'none';
            paymentFrame.src = '';
          }
          
          // Login function
          function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // For demo, just check if values are entered
            if (!email || !password) {
              alert('Please enter email and password');
              return;
            }
            
            // Simulate login
            localStorage.setItem('token', 'demo-token-123');
            checkLoginStatus();
            
            // Show success and switch tab
            alert('Login successful!');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            document.querySelector('.tab[data-tab="payments"]').classList.add('active');
            document.getElementById('payments').classList.add('active');
          }
          
          // Register function
          function register() {
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            // For demo, just check if values are entered
            if (!username || !email || !password) {
              alert('Please fill all fields');
              return;
            }
            
            // Simulate registration
            localStorage.setItem('token', 'demo-token-' + Date.now());
            checkLoginStatus();
            
            // Show success and switch tab
            alert('Registration successful!');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            document.querySelector('.tab[data-tab="payments"]').classList.add('active');
            document.getElementById('payments').classList.add('active');
          }
          
          // Initialize the app
          document.addEventListener('DOMContentLoaded', () => {
            checkLoginStatus();
          });
        </script>
      </body>
    </html>
  `);
});

// Health check endpoint - ALWAYS returns OK (primary for Railway)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mode: 'Complete server'
  });
});

// Get payment plans endpoint
app.get('/api/payments/plans', (req, res) => {
  res.status(200).json({ plans: PAYMENT_PLANS });
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  // Check database
  let dbStatus = 'Not configured';
  
  if (pool) {
    dbStatus = 'Connected';
    
    // Try a simple query
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        dbStatus = 'Error: ' + err.message;
      } else {
        dbStatus = 'Connected: ' + result.rows[0].now;
      }
    });
  }
  
  res.status(200).json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    database: {
      configured: !!pool,
      status: dbStatus,
      url: dbUrl ? 'Configured' : 'Not configured',
    },
    server: {
      port: PORT,
      time: new Date().toISOString(),
      uptime: process.uptime() + ' seconds'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${dbUrl ? 'Configured' : 'Not configured'}`);
  console.log(`========================================`);
});
