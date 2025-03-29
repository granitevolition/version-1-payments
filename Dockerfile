FROM node:16-alpine

WORKDIR /app

# Install additional packages 
RUN apk --no-cache add curl

# Copy package files first for better caching
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy the rest of the application
COPY backend ./backend
COPY database ./database

# Create utils directory if it doesn't exist
RUN mkdir -p backend/utils

# Create directories for logs
RUN mkdir -p /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "backend/server.js"]
