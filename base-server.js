// Super minimal HTTP server with no dependencies
const http = require('http');

// Create the server
const server = http.createServer((req, res) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  
  // Health check endpoint
  if (req.url === '/api/health') {
    console.log('Health check endpoint accessed!');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Server is running</h1></body></html>');
    return;
  }
  
  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Get port from environment variable or use default
const PORT = process.env.PORT || 8080;

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
