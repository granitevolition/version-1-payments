// Super simple HTTP server with no dependencies
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle health check endpoint
  if (req.url === '/api/health') {
    console.log('HEALTH CHECK ENDPOINT ACCESSED!');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Server is healthy',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Version 1 Payments Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { padding: 20px; background-color: #f0f8ff; border-radius: 5px; }
            .link { margin-top: 20px; }
            a { color: #0066cc; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Version 1 Payments Server</h1>
            <div class="status">
              <strong>Status:</strong> Online
              <p>Server is running successfully.</p>
              <p>Current time: ${new Date().toISOString()}</p>
            </div>
            <div class="link">
              <a href="/api/health">Check API Health</a>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }
  
  // Handle 404
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not Found');
});

// Get port from environment or fallback to 8080
const PORT = process.env.PORT || 8080;

// Start server and bind to all interfaces
server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(`Server starting at ${new Date().toISOString()}`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
  console.log('==============================================');
});

// Handle errors to prevent crashes
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
