/**
 * Ultra-minimal server for Railway deployment
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// HTML content for homepage
const homepageHtml = `
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
      }
      h1 { color: #2c3e50; }
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
      }
      .btn:hover { background-color: #2980b9; }
    </style>
  </head>
  <body>
    <h1>Andikar Payment System</h1>
    <p>Simple M-Pesa integration for Andikar AI services</p>
    
    <div class="card">
      <h2>Payment Plans</h2>
      <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #eee; border-radius: 4px;">
        <strong>Basic Plan</strong>
        <p>30,000 words - KES 1,500</p>
        <a href="https://lipia-online.vercel.app/link/andikar" class="btn" target="_blank">Pay Now</a>
      </div>
      
      <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #eee; border-radius: 4px;">
        <strong>Standard Plan</strong>
        <p>60,000 words - KES 2,500</p>
        <a href="https://lipia-online.vercel.app/link/andikar" class="btn" target="_blank">Pay Now</a>
      </div>
      
      <div style="padding: 15px; border: 1px solid #eee; border-radius: 4px;">
        <strong>Premium Plan</strong>
        <p>100,000 words - KES 4,000</p>
        <a href="https://lipia-online.vercel.app/link/andikar" class="btn" target="_blank">Pay Now</a>
      </div>
    </div>
    
    <div class="card">
      <h2>API Endpoints</h2>
      <ul>
        <li><a href="/api/health">/api/health</a> - Health check</li>
        <li><a href="/api/status">/api/status</a> - Server status</li>
      </ul>
    </div>
  </body>
</html>
`;

// Routes
app.get('/', (req, res) => {
  res.send(homepageHtml);
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
