// Super minimal HTTP server with no dependencies
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Log request to console
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle health check endpoint
  if (req.url === '/api/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Handle root path
  if (req.url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body><h1>Server is running</h1><p>Health check available at <a href="/api/health">/api/health</a></p></body></html>');
    return;
  }
  
  // Handle 404 for any other path
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
});

// Get port from environment or use default
const PORT = process.env.PORT || 8080;

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
});
