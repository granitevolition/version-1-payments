FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Set working directory
WORKDIR /app

# First, copy package.json files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY backend ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Create necessary directories
RUN mkdir -p src/db

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]