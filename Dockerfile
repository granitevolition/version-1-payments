FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Copy backend package.json and package-lock.json
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend files
COPY backend ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Show current PostgreSQL connection string and environment (masked)
RUN echo "Database URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:*****@/')"
RUN echo "Database Public URL: $(echo $DATABASE_PUBLIC_URL | sed 's/:[^:]*@/:*****@/')"
RUN echo "Environment: $NODE_ENV"

# Database connectivity check at startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health/db || exit 1

# Start the application
CMD ["node", "server.js"]