FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Set working directory
WORKDIR /app

# Copy only essential files
COPY package.json .
COPY server.js .
COPY railway.json .

# List files for debugging
RUN ls -la

# Install dependencies
RUN npm install express cors pg

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
