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

# Add comprehensive diagnostics
RUN echo "Files in the root directory:" && \
    ls -la && \
    echo "\nChecking for server files:" && \
    find . -name "*.js" | grep -E "(server|index|health|emergency)" && \
    echo "\nChecking file permissions:" && \
    ls -la *.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check - checks /api/health on the local server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start using index.js which has fallback mechanisms
CMD ["node", "index.js"]
