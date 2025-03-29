const express = require('express');
const app = express();

// Log all requests
app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  next();
});

// Super simple health check
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint accessed!');
  res.status(200).send('OK');
});

// Root path
app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Handle other routes
app.use('*', (req, res) => {
  console.log(`404 for: ${req.originalUrl}`);
  res.status(404).send('Not found');
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
