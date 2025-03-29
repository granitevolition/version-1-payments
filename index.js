// Super simple HTTP server with no dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTML for home page with a beautiful GUI
const homePageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Version 1 Payments</title>
    <style>
        :root {
            --primary-color: #4a6cf7;
            --background-color: #f5f7ff;
            --card-bg: #ffffff;
            --text-color: #333333;
            --border-radius: 8px;
            --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            line-height: 1.6;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        
        .header {
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 0;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            flex: 1;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        
        .card {
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: var(--box-shadow);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card-title {
            font-size: 1.25rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: var(--primary-color);
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-indicator.online {
            background-color: #4CAF50;
        }
        
        .status-indicator.offline {
            background-color: #F44336;
        }
        
        .status-text {
            display: flex;
            align-items: center;
            font-weight: 500;
        }
        
        .button {
            display: inline-block;
            background-color: var(--primary-color);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 500;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
            margin-top: 1rem;
        }
        
        .button:hover {
            background-color: #3a56c5;
        }
        
        .footer {
            background-color: var(--primary-color);
            color: white;
            text-align: center;
            padding: 1rem 0;
            margin-top: 2rem;
        }
        
        .server-info {
            margin-top: 2rem;
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: var(--box-shadow);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .info-item {
            padding: 1rem;
            background-color: #f8f9fa;
            border-radius: var(--border-radius);
        }
        
        .info-label {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: var(--primary-color);
        }
        
        .payment-plans {
            margin-top: 2rem;
        }
        
        .plan-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }
        
        .plan-card {
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: var(--box-shadow);
            display: flex;
            flex-direction: column;
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }
        
        .plan-card:hover {
            border-color: var(--primary-color);
            transform: translateY(-5px);
        }
        
        .plan-title {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .plan-price {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0;
        }
        
        .plan-features {
            margin: 1rem 0;
            flex-grow: 1;
        }
        
        .feature-item {
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
        }
        
        .feature-item::before {
            content: "✓";
            color: #4CAF50;
            margin-right: 0.5rem;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Version 1 Payments Dashboard</h1>
    </div>
    
    <div class="container">
        <div class="dashboard">
            <div class="card">
                <div class="card-title">Server Status</div>
                <div class="status-text">
                    <span class="status-indicator online"></span>
                    Online
                </div>
                <p>The server is up and running with all systems operational.</p>
                <a href="/api/health" class="button">Check API Health</a>
            </div>
            
            <div class="card">
                <div class="card-title">API Integration</div>
                <p>Integration with Lipia Online for M-Pesa payments is available.</p>
                <p>Use the endpoint <code>/api/health</code> to check API status.</p>
                <a href="https://lipia-online.vercel.app/link/andikar" class="button" target="_blank">Lipia Online Link</a>
            </div>
            
            <div class="card">
                <div class="card-title">Word Tracking</div>
                <p>Track word usage across different payment tiers.</p>
                <p>View statistics and remaining balance through the dashboard.</p>
                <button class="button" disabled>View Dashboard (Coming Soon)</button>
            </div>
        </div>
        
        <div class="payment-plans">
            <h2>Available Payment Plans</h2>
            <div class="plan-cards">
                <div class="plan-card">
                    <div class="plan-title">Basic Plan</div>
                    <div class="plan-price">1,500 KES</div>
                    <div class="plan-features">
                        <div class="feature-item">30,000 Word Credits</div>
                        <div class="feature-item">Basic API Access</div>
                        <div class="feature-item">Standard Support</div>
                    </div>
                    <button class="button">Select Plan</button>
                </div>
                
                <div class="plan-card">
                    <div class="plan-title">Standard Plan</div>
                    <div class="plan-price">2,500 KES</div>
                    <div class="plan-features">
                        <div class="feature-item">60,000 Word Credits</div>
                        <div class="feature-item">Full API Access</div>
                        <div class="feature-item">Priority Support</div>
                    </div>
                    <button class="button">Select Plan</button>
                </div>
                
                <div class="plan-card">
                    <div class="plan-title">Premium Plan</div>
                    <div class="plan-price">4,000 KES</div>
                    <div class="plan-features">
                        <div class="feature-item">100,000 Word Credits</div>
                        <div class="feature-item">Advanced API Features</div>
                        <div class="feature-item">24/7 Premium Support</div>
                    </div>
                    <button class="button">Select Plan</button>
                </div>
            </div>
        </div>
        
        <div class="server-info">
            <h2>Server Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Server Time</div>
                    <div>${new Date().toISOString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Environment</div>
                    <div>${process.env.NODE_ENV || 'development'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Node.js Version</div>
                    <div>${process.version}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Memory Usage</div>
                    <div>${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>© 2025 Version 1 Payments | Granite Volition</p>
    </div>
</body>
</html>
`;

// Create the server
const server = http.createServer((req, res) => {
  // Log request with timestamp
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle routes
  if (req.url === '/api/health') {
    // Health check endpoint
    console.log('HEALTH CHECK ENDPOINT ACCESSED!');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Service is running',
      timestamp: new Date().toISOString(),
      version: process.version,
      memory: process.memoryUsage()
    }));
  } 
  else if (req.url === '/') {
    // Home page with GUI
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(homePageHtml);
  }
  else if (req.url.startsWith('/api/')) {
    // Handle other API routes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'API endpoint reached',
      endpoint: req.url,
      timestamp: new Date().toISOString()
    }));
  }
  else {
    // 404 for anything else
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 - Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            h1 { color: #e74c3c; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <p><a href="/">Return to Home</a></p>
        </body>
      </html>
    `);
  }
});

// Get port from environment variable or use default
const PORT = process.env.PORT || 8080;

// Start listening on all interfaces
server.listen(PORT, '0.0.0.0', () => {
  console.log('===============================================');
  console.log(`Server started at ${new Date().toISOString()}`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Homepage: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('===============================================');
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`SIGTERM received at ${new Date().toISOString()}`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // In production, we don't want to crash
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});
