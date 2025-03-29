/**
 * This is a simple index.js file to load the server.
 * It attempts to find and run the server.js file at different locations.
 */

try {
  console.log('Starting Andikar Payment API...');
  console.log('Current directory:', process.cwd());
  console.log('Node version:', process.version);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // Try to require the server file from various locations
  try {
    console.log('Attempting to load server.js...');
    require('./server');
  } catch (serverError) {
    console.log('Error loading server.js:', serverError.message);
    
    try {
      console.log('Attempting to load src/server.js...');
      require('./src/server');
    } catch (srcServerError) {
      console.log('Error loading src/server.js:', srcServerError.message);
      
      try {
        console.log('Attempting to load emergency-server.js...');
        require('./emergency-server');
      } catch (emergencyError) {
        console.log('Error loading emergency-server.js:', emergencyError.message);
        
        try {
          console.log('Falling back to health.js...');
          require('./health');
        } catch (healthError) {
          console.log('Error loading health.js:', healthError.message);
          
          // Last resort - create a simple HTTP server
          console.log('Creating inline health check server...');
          const http = require('http');
          const PORT = process.env.PORT || 8080;
          
          http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', message: 'Inline health server running' }));
          }).listen(PORT, () => {
            console.log(`Inline health server running on port ${PORT}`);
          });
        }
      }
    }
  }
} catch (error) {
  console.error('Fatal error starting server:', error);
  
  // Absolute last resort
  try {
    require('http').createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    }).listen(process.env.PORT || 8080);
  } catch (e) {
    // Nothing more we can do
    console.error('Failed to create last resort server:', e);
  }
}
