/**
 * Emergency Health Check Server
 * 
 * This is a minimal server that only provides a health check endpoint.
 * It's used as a fallback if the main server.js can't be found.
 */

const http = require('http');
const PORT = process.env.PORT || 8080;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Emergency health server running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }));
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Emergency server for Andikar Payment API',
      status: 'limited functionality',
      timestamp: new Date().toISOString(),
      error: 'Main server.js not found - only health check is available'
    }));
    return;
  }
  
  // Not found for any other route
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'error',
    message: 'Not found',
    note: 'This is an emergency server with limited functionality'
  }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Emergency server running on port ${PORT}`);
  console.log('WARNING: This is a fallback server with limited functionality');
  console.log('Only /api/health endpoint is fully operational');
  
  // Log environment info for debugging
  console.log('\nEnvironment Information:');
  console.log('----------------------');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`Current Directory: ${process.cwd()}`);
  console.log('Environment Variables:');
  Object.keys(process.env)
    .filter(key => key.includes('DATABASE') || key.includes('URL'))
    .forEach(key => {
      console.log(`  ${key}: ${key.includes('PASSWORD') ? '[HIDDEN]' : (process.env[key] || 'Not set')}`);
    });
});
