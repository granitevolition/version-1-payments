/**
 * Simple Express server that serves both the API and static frontend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend files if they exist
if (require('fs').existsSync(path.join(__dirname, 'frontend/build'))) {
  console.log('Serving frontend from ./frontend/build');
  app.use(express.static(path.join(__dirname, 'frontend/build')));
} else if (require('fs').existsSync(path.join(__dirname, 'public'))) {
  console.log('Serving frontend from ./public');
  app.use(express.static(path.join(__dirname, 'public')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/payments/plans', (req, res) => {
  const plans = {
    basic: { price: 1500, words: 30000, name: 'Basic Plan' },
    standard: { price: 2500, words: 60000, name: 'Standard Plan' },
    premium: { price: 4000, words: 100000, name: 'Premium Plan' }
  };
  
  res.status(200).json({ plans });
});

// Catch-all route to serve frontend for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  if (require('fs').existsSync(path.join(__dirname, 'frontend/build/index.html'))) {
    res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
  } else if (require('fs').existsSync(path.join(__dirname, 'public/index.html'))) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  } else {
    // Simple HTML page if no frontend is found
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Andikar Payment System</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 { color: #2c3e50; }
            .card {
              border-radius: 8px;
              border: 1px solid #e1e4e8;
              padding: 20px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 10px 15px;
              border-radius: 4px;
              text-decoration: none;
              margin-top: 10px;
            }
            .btn:hover {
              background-color: #2980b9;
            }
            .payment-plan {
              display: flex;
              justify-content: space-between;
              padding: 15px;
              border: 1px solid #eee;
              margin-bottom: 10px;
              border-radius: 4px;
            }
            .payment-plan:hover {
              background-color: #f8f9fa;
            }
          </style>
        </head>
        <body>
          <h1>Andikar Payment System</h1>
          <p>Choose a payment plan to get started with Andikar AI services.</p>
          
          <div class="card">
            <h2>Select a Plan</h2>
            <div class="payment-plan">
              <div>
                <strong>Basic Plan</strong>
                <p>30,000 words</p>
              </div>
              <div>
                <strong>KES 1,500</strong>
                <a href="#" class="btn">Select</a>
              </div>
            </div>
            
            <div class="payment-plan">
              <div>
                <strong>Standard Plan</strong>
                <p>60,000 words</p>
              </div>
              <div>
                <strong>KES 2,500</strong>
                <a href="#" class="btn">Select</a>
              </div>
            </div>
            
            <div class="payment-plan">
              <div>
                <strong>Premium Plan</strong>
                <p>100,000 words</p>
              </div>
              <div>
                <strong>KES 4,000</strong>
                <a href="#" class="btn">Select</a>
              </div>
            </div>
          </div>
          
          <p><small>Note: This is a simplified interface as the full frontend is not available.</small></p>
        </body>
      </html>
    `);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
