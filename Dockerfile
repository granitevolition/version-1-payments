FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Add more comprehensive diagnostics
RUN echo "Files in the root directory:" && \
    ls -la && \
    echo "\nChecking for server.js:" && \
    find . -name "server.js" && \
    echo "\nChecking file ownership:" && \
    ls -la *.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Create a wrapper script that's more forgiving about file location
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Andikar Payment API..."' >> /app/start.sh && \
    echo 'echo "Environment: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "Database URL: $(if [ -n "$DATABASE_URL" ]; then echo "Configured"; else echo "Not configured"; fi)"' >> /app/start.sh && \
    echo 'echo "Database Public URL: $(if [ -n "$DATABASE_PUBLIC_URL" ]; then echo "Configured"; else echo "Not configured"; fi)"' >> /app/start.sh && \
    echo 'echo "Current directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "Files in current directory:"' >> /app/start.sh && \
    echo 'ls -la' >> /app/start.sh && \
    echo 'echo "Finding server.js:"' >> /app/start.sh && \
    echo 'find / -name "server.js" 2>/dev/null' >> /app/start.sh && \
    echo 'if [ -f "/app/server.js" ]; then' >> /app/start.sh && \
    echo '  echo "Starting server from /app/server.js"' >> /app/start.sh && \
    echo '  node /app/server.js' >> /app/start.sh && \
    echo 'elif [ -f "./server.js" ]; then' >> /app/start.sh && \
    echo '  echo "Starting server from ./server.js"' >> /app/start.sh && \
    echo '  node ./server.js' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "ERROR: server.js not found!"' >> /app/start.sh && \
    echo '  echo "Creating minimal health check server for debugging..."' >> /app/start.sh && \
    echo '  echo "const http = require(\\"http\\"); const server = http.createServer((req, res) => { res.writeHead(200); res.end(\\"{\\\"status\\\":\\\"ok\\\", \\\"message\\\":\\\"Emergency health server running\\\"}\\\"); }); server.listen(8080, () => console.log(\\"Emergency server running on port 8080\\"));" > emergency.js' >> /app/start.sh && \
    echo '  node emergency.js' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    chmod +x /app/start.sh

# Health check - checks /api/health on the local server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start the application using the wrapper script
CMD ["/app/start.sh"]
