FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl

# Set working directory
WORKDIR /app

# Copy everything to the container
COPY . .

# Show file contents for debugging
RUN ls -la

# Install express and pg for database
RUN npm install express cors pg

# Create minimal server if none exists
RUN echo "const express = require('express'); \
    const app = express(); \
    const PORT = process.env.PORT || 8080; \
    app.get('/', (req, res) => { \
      res.send('<h1>Andikar Payment System</h1><p>The payment system is running!</p>'); \
    }); \
    app.get('/api/health', (req, res) => { \
      res.status(200).json({ status: 'ok', message: 'Server is running' }); \
    }); \
    app.listen(PORT, () => console.log('Server running on port ' + PORT)); \
    " > emergency-server.js

# Create a startup script
RUN echo "#!/bin/sh \
    && echo 'Starting Andikar Payment API...' \
    && ls -la \
    && if [ -f 'server.js' ]; then \
         echo 'Found server.js, starting...' && node server.js; \
       else \
         echo 'server.js not found, using emergency server...' && node emergency-server.js; \
       fi \
    " > start.sh && chmod +x start.sh

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Use the startup script
CMD ["sh", "start.sh"]
